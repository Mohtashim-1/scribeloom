import { defineExtension, registerFeature, type OpenEditExtension } from "@openedit/core";
import { Extension, mergeAttributes, Node } from "@tiptap/core";
import type { SlashMenuItem } from "./slash-menu";

declare module "@openedit/core" {
  interface FeatureRegistry {
    callouts: true;
    columns: true;
  }
}

/** The kinds of callout, which set its colour and icon. */
export type CalloutType = "info" | "success" | "warning" | "danger";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wraps the selected blocks in a callout, or changes the type of the one around them. */
      setCallout: (type?: CalloutType) => ReturnType;
      /** Wraps the selection in a callout, or unwraps it if it is in one. */
      toggleCallout: (type?: CalloutType) => ReturnType;
      /** Lifts the content out of the callout around the selection. */
      unsetCallout: () => ReturnType;
    };
    columns: {
      /** Inserts a row of side-by-side columns (2 to 4). */
      setColumns: (count?: number) => ReturnType;
      /** Replaces the columns around the selection with their content, stacked. */
      unsetColumns: () => ReturnType;
    };
  }
}

const CALLOUT_TYPES: CalloutType[] = ["info", "success", "warning", "danger"];

/** Exposes slash menu entries from an extension's storage, where the slash menu looks. */
function slashItems(name: string, items: SlashMenuItem[]) {
  return Extension.create({ name, addStorage: () => ({ slashItems: items }) });
}

/**
 * Callouts: a highlighted box for notes, tips and warnings, holding any
 * blocks. Commands: `setCallout(type)`, `toggleCallout(type)`, `unsetCallout()`.
 */
export function callouts(): OpenEditExtension {
  return defineExtension({
    name: "callouts",
    engine: () => [
      Node.create({
        name: "callout",
        group: "block",
        content: "block+",
        defining: true,
        addAttributes: () => ({
          type: {
            default: "info",
            parseHTML: (element: HTMLElement) => {
              const type = element.getAttribute("data-callout") as CalloutType;
              return CALLOUT_TYPES.includes(type) ? type : "info";
            },
            renderHTML: (attributes: { type?: string }) => ({ "data-callout": attributes.type }),
          },
        }),
        parseHTML: () => [{ tag: "div[data-callout]" }],
        renderHTML: ({ HTMLAttributes }) => [
          "div",
          mergeAttributes(HTMLAttributes, { class: "oe-callout", role: "note" }),
          0,
        ],
        addCommands() {
          return {
            setCallout:
              (type = "info") =>
              ({ commands, editor }) =>
                editor.isActive(this.name)
                  ? commands.updateAttributes(this.name, { type })
                  : commands.wrapIn(this.name, { type }),
            toggleCallout:
              (type = "info") =>
              ({ commands }) =>
                commands.toggleWrap(this.name, { type }),
            unsetCallout:
              () =>
              ({ commands }) =>
                commands.lift(this.name),
          };
        },
      }),
      slashItems("calloutSlashItems", [
        {
          id: "callout",
          title: "Callout",
          description: "Highlighted note or warning",
          group: "Blocks",
          keywords: ["note", "info", "tip", "warning", "admonition"],
          run: (editor) => editor.chain().focus().setCallout("info").run(),
        },
      ]),
    ],
  });
}

/**
 * Columns: blocks side by side. Each column holds any blocks. On narrow
 * screens the default styles stack them. Commands: `setColumns(count)`,
 * `unsetColumns()`.
 */
export function columns(): OpenEditExtension {
  return defineExtension({
    name: "columns",
    engine: () => [
      Node.create({
        name: "columns",
        group: "block",
        content: "column{2,4}",
        defining: true,
        isolating: true,
        parseHTML: () => [{ tag: "div[data-columns]" }],
        renderHTML: ({ HTMLAttributes, node }) => [
          "div",
          mergeAttributes(HTMLAttributes, { "data-columns": node.childCount, class: "oe-columns" }),
          0,
        ],
        addCommands() {
          return {
            setColumns:
              (count = 2) =>
              ({ commands }) => {
                const size = Math.max(2, Math.min(4, Math.round(count)));
                return commands.insertContent({
                  type: this.name,
                  content: Array.from({ length: size }, () => ({
                    type: "column",
                    content: [{ type: "paragraph" }],
                  })),
                });
              },
            unsetColumns:
              () =>
              ({ state, dispatch }) => {
                const { $from } = state.selection;
                for (let depth = $from.depth; depth > 0; depth--) {
                  const node = $from.node(depth);
                  if (node.type.name !== this.name) continue;
                  // The blocks of every column, in reading order.
                  const blocks: (typeof node)[] = [];
                  node.forEach((column) => column.forEach((block) => blocks.push(block)));
                  const start = $from.before(depth);
                  dispatch?.(state.tr.replaceWith(start, start + node.nodeSize, blocks));
                  return true;
                }
                return false;
              },
          };
        },
      }),
      Node.create({
        name: "column",
        content: "block+",
        isolating: true,
        parseHTML: () => [{ tag: "div[data-column]" }],
        renderHTML: ({ HTMLAttributes }) => [
          "div",
          mergeAttributes(HTMLAttributes, { "data-column": "", class: "oe-column" }),
          0,
        ],
      }),
      slashItems("columnsSlashItems", [
        {
          id: "columns2",
          title: "2 columns",
          description: "Two blocks side by side",
          group: "Layout",
          keywords: ["columns", "layout", "split", "side"],
          run: (editor) => editor.chain().focus().setColumns(2).run(),
        },
        {
          id: "columns3",
          title: "3 columns",
          description: "Three blocks side by side",
          group: "Layout",
          keywords: ["columns", "layout", "split", "side"],
          run: (editor) => editor.chain().focus().setColumns(3).run(),
        },
      ]),
    ],
  });
}

registerFeature("callouts", () => callouts());
registerFeature("columns", () => columns());
