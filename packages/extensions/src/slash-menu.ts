import {
  defineExtension,
  getEditor,
  registerFeature,
  type OpenEditExtension,
  type OpenEditor,
} from "@openedit/core";
import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion, type SuggestionProps } from "@tiptap/suggestion";
import { pickImageFiles } from "./images";
import { createStore, type Store } from "./store";

declare module "@openedit/core" {
  interface FeatureRegistry {
    "slash-menu": true;
  }
}

/**
 * One entry in the slash menu.
 */
export interface SlashMenuItem {
  /** Stable id. The default UI uses it to pick an icon. */
  id: string;
  title: string;
  description?: string;
  /** Heading the item is listed under. */
  group: string;
  /** Extra words the search matches, besides the title. */
  keywords?: string[];
  /** Engine extension the item needs (e.g. `"table"`). Hidden when it is missing. */
  requires?: string;
  /** Runs the item. The typed `/query` has already been removed. */
  run: (editor: OpenEditor) => void;
}

/**
 * State of the slash menu. Read it with {@link getSlashMenu}.
 */
export interface SlashMenuState {
  open: boolean;
  /** Text typed after the `/`. */
  query: string;
  /** Items matching the query. */
  items: SlashMenuItem[];
  selectedIndex: number;
  /** Screen rectangle of the typed `/query`, to anchor the menu to. */
  getRect: (() => DOMRect | null) | null;
}

/**
 * Handle for rendering the slash menu and acting on it.
 */
export interface SlashMenu {
  store: Store<SlashMenuState>;
  /** Highlights an item, e.g. on hover. */
  setSelectedIndex: (index: number) => void;
  /** Runs an item and closes the menu. */
  select: (item: SlashMenuItem) => void;
}

/**
 * Options for the {@link slashMenu} feature.
 */
export interface SlashMenuOptions {
  /** Replaces the default items. Receives them, so you can add or filter. */
  items?: (defaults: SlashMenuItem[]) => SlashMenuItem[];
}

const STORAGE_NAME = "slashMenu";
const CLOSED: SlashMenuState = {
  open: false,
  query: "",
  items: [],
  selectedIndex: 0,
  getRect: null,
};

/** The built-in slash menu items. */
export const defaultSlashMenuItems: SlashMenuItem[] = [
  {
    id: "paragraph",
    title: "Text",
    description: "Plain paragraph",
    group: "Basic",
    keywords: ["paragraph", "p"],
    run: (editor) => editor.chain().focus().setParagraph().run(),
  },
  ...([1, 2, 3] as const).map((level): SlashMenuItem => ({
    id: `heading${level}`,
    title: `Heading ${level}`,
    description: ["Large section heading", "Medium section heading", "Small section heading"][
      level - 1
    ],
    group: "Basic",
    keywords: ["title", `h${level}`],
    run: (editor) => editor.chain().focus().setHeading({ level }).run(),
  })),
  {
    id: "bulletList",
    title: "Bullet list",
    description: "Unordered list",
    group: "Lists",
    keywords: ["unordered", "ul"],
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    title: "Numbered list",
    description: "Ordered list",
    group: "Lists",
    keywords: ["ordered", "ol"],
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "taskList",
    title: "Task list",
    description: "List with checkboxes",
    group: "Lists",
    keywords: ["todo", "checkbox", "check"],
    requires: "taskList",
    run: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: "blockquote",
    title: "Quote",
    description: "Block quotation",
    group: "Blocks",
    keywords: ["blockquote", "citation"],
    run: (editor) => editor.chain().focus().setBlockquote().run(),
  },
  {
    id: "codeBlock",
    title: "Code block",
    description: "Monospaced code",
    group: "Blocks",
    keywords: ["pre", "snippet"],
    run: (editor) => editor.chain().focus().setCodeBlock().run(),
  },
  {
    id: "horizontalRule",
    title: "Divider",
    description: "Horizontal line",
    group: "Blocks",
    keywords: ["hr", "rule", "separator", "line"],
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "table",
    title: "Table",
    description: "3 × 3 table with a header row",
    group: "Insert",
    keywords: ["grid", "rows", "columns"],
    requires: "table",
    run: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: "image",
    title: "Image",
    description: "Upload from your device",
    group: "Insert",
    keywords: ["picture", "photo", "upload"],
    requires: "image",
    run: (editor) => pickImageFiles(editor),
  },
];

/**
 * Filters items by a search query. Items where a word of the title or a
 * keyword starts with the query come first, then items that contain it.
 */
export function filterSlashMenuItems(items: SlashMenuItem[], query: string): SlashMenuItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  const rank = (item: SlashMenuItem): number => {
    const words = [item.title, ...(item.keywords ?? [])].flatMap((text) =>
      text.toLowerCase().split(/\s+/),
    );
    if (words.some((word) => word.startsWith(needle))) return 0;
    if (words.some((word) => word.includes(needle))) return 1;
    return -1;
  };
  return items
    .map((item) => ({ item, score: rank(item) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => a.score - b.score)
    .map(({ item }) => item);
}

/**
 * Returns the slash menu of an editor, or `null` if the feature is off.
 */
export function getSlashMenu(editor: OpenEditor): SlashMenu | null {
  const storage = editor.engine.storage as unknown as Record<string, unknown>;
  return (storage[STORAGE_NAME] as SlashMenu | undefined) ?? null;
}

/**
 * The `/` command menu, headless. It tracks the query, the matching items and
 * the keyboard selection; a UI (such as `SlashMenu` in `@openedit/ui`) renders
 * the state from {@link getSlashMenu}.
 *
 * Keys while open: Up / Down to move, Enter to run, Escape to dismiss.
 */
export function slashMenu(options: SlashMenuOptions = {}): OpenEditExtension {
  return defineExtension({
    name: "slash-menu",
    engine: () =>
      Extension.create<object, SlashMenu>({
        name: STORAGE_NAME,

        addStorage() {
          const store = createStore(CLOSED);
          return {
            store,
            setSelectedIndex: (index) =>
              store.setState({ ...store.getState(), selectedIndex: index }),
            // Replaced once the menu opens and knows the range to delete.
            select: () => {},
          };
        },

        addProseMirrorPlugins() {
          const engine = this.editor;
          const menu = this.storage;
          const { store } = menu;
          const all = options.items?.(defaultSlashMenuItems) ?? defaultSlashMenuItems;

          // Matching is done here, not through the plugin's `items` option,
          // which resolves asynchronously and would open the menu empty.
          const matching = (query: string) => {
            const editor = getEditor(engine);
            const available = all.filter(
              (item) => !item.requires || (editor?.has(item.requires) ?? false),
            );
            return filterSlashMenuItems(available, query);
          };
          const show = (props: SuggestionProps<SlashMenuItem, SlashMenuItem>) => {
            menu.select = (item) => props.command(item);
            store.setState({
              open: true,
              query: props.query,
              items: matching(props.query),
              selectedIndex: 0,
              getRect: props.clientRect ?? null,
            });
          };

          return [
            Suggestion<SlashMenuItem, SlashMenuItem>({
              editor: engine,
              pluginKey: new PluginKey("openeditSlashMenu"),
              char: "/",
              allow: ({ state }) => !state.selection.$from.parent.type.spec.code,
              command: ({ range, props: item }) => {
                const editor = getEditor(engine);
                if (!editor) return;
                editor.chain().focus().deleteRange(range).run();
                item.run(editor);
              },
              render: () => ({
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
                    menu.setSelectedIndex((state.selectedIndex + step + count) % count);
                    return true;
                  }
                  if (event.key === "Enter") {
                    const item = state.items[state.selectedIndex];
                    if (item) menu.select(item);
                    return true;
                  }
                  return false;
                },
                onExit: () => {
                  menu.select = () => {};
                  store.setState(CLOSED);
                },
              }),
            }),
          ];
        },
      }),
  });
}

registerFeature("slash-menu", () => slashMenu());
