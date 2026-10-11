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
import { Mathematics } from "@tiptap/extension-mathematics";

declare module "@openedit/core" {
  interface FeatureRegistry {
    math: true;
  }
}

/** The formula being edited. */
export interface MathEditing {
  /** Document position of the formula. */
  pos: number;
  latex: string;
  /** A displayed formula on its own line, as opposed to one inside the text. */
  block: boolean;
}

/** State of the math feature. Read it with {@link getMath}. */
export interface MathState {
  editing: MathEditing | null;
}

/** Handle for editing formulas. */
export interface MathEditor {
  store: Store<MathState>;
  /** Inserts a formula at the selection and opens it for editing. */
  insert: (options?: { latex?: string; block?: boolean }) => void;
  /** Changes the formula being edited. An empty value removes it. */
  update: (latex: string) => void;
  /** Stops editing. */
  close: () => void;
  /** Screen rectangle of the formula being edited. */
  getRect: () => DOMRect | null;
}

const STORAGE_NAME = "math";

/**
 * Returns the math handle of an editor, or `null` if the feature is off.
 */
export function getMath(editor: OpenEditor): MathEditor | null {
  const storage = editor.engine.storage as unknown as Record<string, unknown>;
  return (storage[STORAGE_NAME] as MathEditor | undefined) ?? null;
}

/**
 * Formulas written in LaTeX and rendered with KaTeX, inline or as a block.
 * Clicking a formula opens it for editing (the UI is `MathMenu` in
 * `@openedit/ui`).
 *
 * Include KaTeX's stylesheet once in your app:
 * `import "katex/dist/katex.min.css"`.
 */
export function math(): OpenEditExtension {
  return defineExtension({
    name: "math",
    engine: () => {
      const store = createStore<MathState>({ editing: null });
      const open = (block: boolean) => (node: { attrs: Record<string, unknown> }, pos: number) =>
        store.setState({ editing: { pos, latex: String(node.attrs.latex ?? ""), block } });

      return [
        Mathematics.configure({
          inlineOptions: { onClick: open(false) },
          blockOptions: { onClick: open(true) },
          // Bad LaTeX shows as an error in place instead of throwing.
          katexOptions: { throwOnError: false },
        }),
        Extension.create<object, MathEditor & { slashItems: unknown[] }>({
          name: STORAGE_NAME,
          addStorage() {
            return { store, slashItems: [] } as unknown as MathEditor & { slashItems: unknown[] };
          },
          onBeforeCreate() {
            const engine = this.editor;
            const api: MathEditor = {
              store,
              insert: ({ latex = "E = mc^2", block = true } = {}) => {
                const pos = engine.state.selection.from;
                if (block) engine.chain().focus().insertBlockMath({ latex }).run();
                else engine.chain().focus().insertInlineMath({ latex }).run();
                // The node lands at the selection, or just after it when a block had to be split.
                const type = block ? "blockMath" : "inlineMath";
                let found: number | null = null;
                const { doc } = engine.state;
                doc.nodesBetween(
                  Math.max(0, pos - 1),
                  Math.min(doc.content.size, pos + 3),
                  (node, at) => {
                    if (found === null && node.type.name === type) found = at;
                  },
                );
                if (found !== null) store.setState({ editing: { pos: found, latex, block } });
              },
              update: (latex) => {
                const { editing } = store.getState();
                if (!editing) return;
                const chain = engine.chain();
                if (!latex.trim()) {
                  const node = engine.state.doc.nodeAt(editing.pos);
                  if (node)
                    chain.deleteRange({ from: editing.pos, to: editing.pos + node.nodeSize }).run();
                  store.setState({ editing: null });
                  return;
                }
                if (editing.block) chain.updateBlockMath({ latex, pos: editing.pos }).run();
                else chain.updateInlineMath({ latex, pos: editing.pos }).run();
                store.setState({ editing: { ...editing, latex } });
              },
              close: () => store.setState({ editing: null }),
              getRect: () => {
                const { editing } = store.getState();
                const editor = getEditor(engine);
                if (!editing || !editor?.isMounted) return null;
                const dom = engine.view.nodeDOM(editing.pos);
                return dom instanceof HTMLElement ? dom.getBoundingClientRect() : null;
              },
            };
            Object.assign(this.storage, api, {
              slashItems: [
                {
                  id: "math",
                  title: "Math",
                  description: "Formula written in LaTeX",
                  group: "Insert",
                  keywords: ["formula", "equation", "latex", "katex"],
                  run: () => api.insert(),
                },
              ],
            });
          },
        }),
      ];
    },
  });
}

registerFeature("math", () => math());
