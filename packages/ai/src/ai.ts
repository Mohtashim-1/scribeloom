import {
  createStore,
  defineExtension,
  getEditor,
  registerFeature,
  type OpenEditExtension,
  type OpenEditor,
  type Store,
} from "@openedit/core";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { defaultAIActions, SYSTEM_PROMPT, type AIAction } from "./actions";
import type { AIProvider } from "./provider";

declare module "@openedit/core" {
  interface FeatureRegistry {
    ai: true;
  }
  interface EditorOptions {
    /** Settings for the `ai` feature. Required when it is enabled by name. */
    ai?: AIOptions;
  }
}

/**
 * Options for the {@link ai} feature.
 */
export interface AIOptions {
  /** Where the text comes from, e.g. `openaiCompatible({ baseUrl })`. */
  provider: AIProvider;
  /** Replaces the default actions. Receives them, so you can add or filter. */
  actions?: (defaults: AIAction[]) => AIAction[];
  /** Replaces the instructions sent with every request. */
  systemPrompt?: string;
}

/**
 * State of the AI feature. Read it with {@link getAI}.
 */
export interface AIState {
  /**
   * `asking`: waiting for the user to type a language or instruction.
   * `streaming`: text is arriving. `done`: finished, waiting to be accepted
   * or discarded. `error`: the request failed.
   */
  status: "idle" | "asking" | "streaming" | "done" | "error";
  /** The action in progress. */
  actionId: string | null;
  /** The text generated so far. */
  output: string;
  error: string | null;
}

/**
 * Handle for the AI feature.
 */
export interface AI {
  store: Store<AIState>;
  actions: AIAction[];
  /**
   * Starts an action on the selection, or on the current block if nothing is
   * selected. Actions that need input first move to `asking`, unless `input`
   * is given.
   */
  run: (actionId: string, input?: string) => void;
  /** Stops generating and keeps what has arrived. */
  stop: () => void;
  /** Runs the same action again. */
  retry: () => void;
  /** Puts the generated text into the document. */
  accept: () => void;
  /** Throws the generated text away. */
  discard: () => void;
  /** Screen rectangle of the text being worked on, to anchor a panel to. */
  getRect: () => DOMRect | null;
}

interface Target {
  from: number;
  to: number;
}

const STORAGE_NAME = "ai";
const IDLE: AIState = { status: "idle", actionId: null, output: "", error: null };
const CONTEXT_LENGTH = 4000;
const pluginKey = new PluginKey<Target | null>("openeditAI");

/**
 * Returns the AI handle of an editor, or `null` if the feature is off.
 */
export function getAI(editor: OpenEditor): AI | null {
  const storage = editor.engine.storage as unknown as Record<string, unknown>;
  return (storage[STORAGE_NAME] as AI | undefined) ?? null;
}

/**
 * AI writing assistance. The generated text streams into the document as a
 * preview next to the text it was made from; nothing changes until the user
 * accepts it. Headless: `AIPanel` and `AIMenu` in `@openedit/ui` provide the
 * interface.
 *
 * The feature sends text only to the provider you configure, and only when
 * the user runs an action.
 */
export function ai(options: AIOptions): OpenEditExtension {
  return defineExtension({
    name: "ai",
    engine: () => {
      const store = createStore<AIState>(IDLE);
      const actions = options.actions?.(defaultAIActions) ?? defaultAIActions;
      // The preview is a single element updated in place as text arrives.
      const preview = document.createElement("span");
      preview.className = "oe-ai-preview";
      preview.setAttribute("aria-hidden", "true");

      return Extension.create<object, AI & { slashItems: unknown[] }>({
        name: STORAGE_NAME,

        addStorage() {
          // Filled in by onBeforeCreate, once the editor exists.
          return { store, actions, slashItems: [] } as unknown as AI & { slashItems: unknown[] };
        },

        onBeforeCreate() {
          const engine = this.editor;
          // Looked up on use: the wrapper is registered just after this hook runs.
          const editor = () => getEditor(engine)!;
          const target = () => pluginKey.getState(engine.state) ?? null;
          const setTarget = (next: Target | null) =>
            engine.view.dispatch(engine.state.tr.setMeta(pluginKey, { target: next }));
          const set = (patch: Partial<AIState>) => {
            const next = { ...store.getState(), ...patch };
            preview.textContent = next.output;
            store.setState(next);
          };
          let controller: AbortController | null = null;
          let lastInput = "";

          const reset = () => {
            controller?.abort();
            controller = null;
            set(IDLE);
            if (editor().isMounted && target()) setTarget(null);
          };

          const start = async (action: AIAction, input: string) => {
            const range = target();
            if (!range) return;
            const { doc } = engine.state;
            controller?.abort();
            controller = new AbortController();
            const { signal } = controller;
            lastInput = input;
            set({ status: "streaming", actionId: action.id, output: "", error: null });
            try {
              const prompt = action.prompt({
                text: doc.textBetween(range.from, range.to, "\n"),
                before: doc.textBetween(0, range.to, "\n").slice(-CONTEXT_LENGTH),
                input,
              });
              const request = { system: options.systemPrompt ?? SYSTEM_PROMPT, prompt, signal };
              for await (const piece of options.provider.stream(request)) {
                if (signal.aborted) break;
                set({ output: store.getState().output + piece });
              }
              if (controller.signal === signal) set({ status: "done" });
            } catch (error) {
              if (controller?.signal !== signal) return;
              set({
                status: signal.aborted ? "done" : "error",
                error: signal.aborted
                  ? null
                  : error instanceof Error
                    ? error.message
                    : String(error),
              });
            }
          };

          const api: AI = {
            store,
            actions,
            run: (actionId, input) => {
              const action = actions.find((candidate) => candidate.id === actionId);
              if (!action || !editor().isEditable) return;
              if (!target()) {
                // The selection, or the block around the cursor.
                const { from, to, empty, $from } = engine.state.selection;
                const whole = action.id === "continue" || !$from.parent.isTextblock;
                setTarget(
                  empty
                    ? { from: whole ? to : $from.start(), to: whole ? to : $from.end() }
                    : { from, to },
                );
              }
              if (action.input && !input?.trim()) {
                set({ status: "asking", actionId, output: "", error: null });
                return;
              }
              void start(action, input?.trim() ?? "");
            },
            stop: () => {
              controller?.abort();
              if (store.getState().status === "streaming") set({ status: "done" });
            },
            retry: () => {
              const action = actions.find(
                (candidate) => candidate.id === store.getState().actionId,
              );
              if (action) void start(action, lastInput);
            },
            accept: () => {
              const range = target();
              const { output, actionId } = store.getState();
              const action = actions.find((candidate) => candidate.id === actionId);
              const text = output.trim();
              reset();
              if (!range || !action || !text) return;
              // Plain text only: blank lines become paragraphs, nothing is parsed as HTML.
              const paragraphs = text.split(/\n\s*\n/).map((paragraph) => paragraph.trim());
              const content =
                paragraphs.length === 1
                  ? { type: "text", text: paragraphs[0]! }
                  : paragraphs.map((paragraph) => ({
                      type: "paragraph",
                      content: [{ type: "text", text: paragraph }],
                    }));
              const chain = editor().chain().focus();
              if (action.placement === "replace" && range.to > range.from) {
                chain.insertContentAt(range, content).run();
                return;
              }
              const before = engine.state.doc.textBetween(Math.max(0, range.to - 1), range.to);
              const spaced =
                paragraphs.length === 1 && before && !/\s/.test(before)
                  ? { type: "text", text: ` ${paragraphs[0]}` }
                  : content;
              chain.insertContentAt(range.to, spaced).run();
            },
            discard: () => {
              reset();
              editor().focus();
            },
            getRect: () => {
              const range = target();
              const source = range ? editor().getRangeRect(range.from, range.to) : null;
              if (!source || !preview.isConnected || !preview.textContent) return source;
              // Include the preview, so a panel below does not cover it.
              const shown = preview.getBoundingClientRect();
              const top = Math.min(source.top, shown.top);
              const left = Math.min(source.left, shown.left);
              return new DOMRect(
                left,
                top,
                Math.max(source.right, shown.right) - left,
                Math.max(source.bottom, shown.bottom) - top,
              );
            },
          };
          Object.assign(this.storage, api, {
            teardown: () => controller?.abort(),
            slashItems: [
              {
                id: "ai-continue",
                title: "Continue writing",
                description: "Let AI write what comes next",
                group: "AI",
                keywords: ["ai", "write", "more"],
                run: () => api.run("continue"),
              },
              {
                id: "ai-ask",
                title: "Ask AI",
                description: "Give AI an instruction",
                group: "AI",
                keywords: ["ai", "prompt", "generate"],
                run: () => api.run("custom"),
              },
            ],
          });
        },

        onDestroy() {
          (this.storage as unknown as { teardown?: () => void }).teardown?.();
        },

        addProseMirrorPlugins() {
          return [
            new Plugin<Target | null>({
              key: pluginKey,
              state: {
                init: () => null,
                apply(tr, value) {
                  const meta = tr.getMeta(pluginKey) as { target: Target | null } | undefined;
                  if (meta) return meta.target;
                  if (!value || !tr.docChanged) return value;
                  // Follow the text if the document changes while we wait.
                  return { from: tr.mapping.map(value.from, 1), to: tr.mapping.map(value.to, -1) };
                },
              },
              props: {
                decorations(state) {
                  const range = pluginKey.getState(state);
                  if (!range) return null;
                  const action = actions.find((item) => item.id === store.getState().actionId);
                  const decorations = [
                    Decoration.widget(range.to, preview, { side: 1, key: "oe-ai" }),
                  ];
                  if (range.to > range.from) {
                    decorations.push(
                      Decoration.inline(range.from, range.to, {
                        class:
                          action?.placement === "replace"
                            ? "oe-ai-source oe-ai-replace"
                            : "oe-ai-source",
                      }),
                    );
                  }
                  return DecorationSet.create(state.doc, decorations);
                },
              },
            }),
          ];
        },
      });
    },
  });
}

registerFeature("ai", (options) => {
  if (!options.ai) {
    throw new Error('The "ai" feature needs the `ai` option: { provider }.');
  }
  return ai(options.ai);
});
