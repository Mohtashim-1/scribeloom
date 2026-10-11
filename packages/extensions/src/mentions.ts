import {
  createStore,
  defineExtension,
  registerFeature,
  type OpenEditExtension,
  type OpenEditor,
  type Store,
} from "@openedit/core";
import { Extension, mergeAttributes } from "@tiptap/core";
import { Mention } from "@tiptap/extension-mention";
import { PluginKey } from "@tiptap/pm/state";

declare module "@openedit/core" {
  interface FeatureRegistry {
    mentions: true;
  }
  interface EditorOptions {
    /** Settings for the `mentions` feature. */
    mentions?: MentionsOptions;
  }
}

/** Someone (or something) that can be mentioned. */
export interface MentionItem {
  id: string;
  /** Shown in the menu and in the document, after the `@`. */
  label: string;
  /** Secondary line in the menu, e.g. a role or email. */
  description?: string;
}

/**
 * Options for the {@link mentions} feature.
 */
export interface MentionsOptions {
  /**
   * The people to offer for what has been typed after `@`. May be async, for
   * a server-side search. Without it nobody can be mentioned.
   */
  items?: (query: string) => MentionItem[] | Promise<MentionItem[]>;
}

/**
 * State of the mention menu. Read it with {@link getMentions}.
 */
export interface MentionsState {
  open: boolean;
  /** Text typed after the `@`. */
  query: string;
  items: MentionItem[];
  selectedIndex: number;
  /** Whether a search is still running. */
  loading: boolean;
  /** Screen rectangle of the typed `@query`, to anchor the menu to. */
  getRect: (() => DOMRect | null) | null;
}

/** Handle for rendering the mention menu and acting on it. */
export interface Mentions {
  store: Store<MentionsState>;
  setSelectedIndex: (index: number) => void;
  /** Inserts the mention and closes the menu. */
  select: (item: MentionItem) => void;
}

const STORAGE_NAME = "mentions";
const CLOSED: MentionsState = {
  open: false,
  query: "",
  items: [],
  selectedIndex: 0,
  loading: false,
  getRect: null,
};

/**
 * Returns the mentions handle of an editor, or `null` if the feature is off.
 */
export function getMentions(editor: OpenEditor): Mentions | null {
  const storage = editor.engine.storage as unknown as Record<string, unknown>;
  return (storage[STORAGE_NAME] as Mentions | undefined) ?? null;
}

/**
 * `@` mentions. Typing `@` opens a menu of people from your `items`
 * function; picking one inserts a mention that stays intact as a unit.
 * Headless: `MentionMenu` in `@openedit/ui` renders the menu.
 *
 * Keys while open: Up / Down to move, Enter or Tab to pick, Escape to dismiss.
 */
export function mentions(options: MentionsOptions = {}): OpenEditExtension {
  return defineExtension({
    name: "mentions",
    engine: () => {
      const store = createStore(CLOSED);
      const api: Mentions = {
        store,
        setSelectedIndex: (index) => store.setState({ ...store.getState(), selectedIndex: index }),
        select: () => {},
      };
      // Only the latest search may update the menu.
      let search = 0;

      return [
        Extension.create<object, Mentions>({ name: STORAGE_NAME, addStorage: () => api }),
        Mention.configure({
          renderText: ({ node }) => `@${String(node.attrs.label ?? node.attrs.id)}`,
          renderHTML: ({ options: mention, node }) => [
            "span",
            mergeAttributes(mention.HTMLAttributes, { class: "oe-mention" }),
            `@${String(node.attrs.label ?? node.attrs.id)}`,
          ],
          suggestion: {
            pluginKey: new PluginKey("openeditMentions"),
            char: "@",
            render: () => {
              const show = (props: {
                query: string;
                clientRect?: (() => DOMRect | null) | null;
                command: (attrs: { id: string; label: string }) => void;
              }) => {
                api.select = (item) => props.command({ id: item.id, label: item.label });
                const previous = store.getState();
                if (previous.open && previous.query === props.query) {
                  // Same query (the engine reports each change more than once): do not search again.
                  store.setState({ ...previous, getRect: props.clientRect ?? null });
                  return;
                }
                const ticket = ++search;
                const base = {
                  open: true,
                  query: props.query,
                  selectedIndex: 0,
                  getRect: props.clientRect ?? null,
                };
                let result: MentionItem[] | Promise<MentionItem[]>;
                try {
                  result = options.items?.(props.query) ?? [];
                } catch {
                  result = [];
                }
                if (!(result instanceof Promise)) {
                  store.setState({ ...base, items: result, loading: false });
                  return;
                }
                // Keep the previous results on screen while the next ones load.
                store.setState({ ...base, items: store.getState().items, loading: true });
                result
                  .catch(() => [] as MentionItem[])
                  .then((items) => {
                    if (ticket === search && store.getState().open) {
                      store.setState({
                        ...store.getState(),
                        items,
                        loading: false,
                        selectedIndex: 0,
                      });
                    }
                  });
              };
              return {
                onStart: show,
                onUpdate: show,
                onKeyDown: ({ event }) => {
                  const state = store.getState();
                  if (!state.open) return false;
                  if (event.key === "Escape") {
                    store.setState(CLOSED);
                    return true;
                  }
                  const count = state.items.length;
                  if (!count) return false;
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    const step = event.key === "ArrowDown" ? 1 : -1;
                    api.setSelectedIndex((state.selectedIndex + step + count) % count);
                    return true;
                  }
                  if (event.key === "Enter" || event.key === "Tab") {
                    const item = state.items[state.selectedIndex];
                    if (item) api.select(item);
                    return true;
                  }
                  return false;
                },
                onExit: () => {
                  search++;
                  api.select = () => {};
                  store.setState(CLOSED);
                },
              };
            },
          },
        }),
      ];
    },
  });
}

registerFeature("mentions", (options) => mentions(options.mentions));
