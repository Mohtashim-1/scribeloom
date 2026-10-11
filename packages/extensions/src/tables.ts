import { defineExtension, registerFeature, type OpenEditExtension } from "@openedit/core";
import { TableKit } from "@tiptap/extension-table";

declare module "@openedit/core" {
  interface FeatureRegistry {
    tables: true;
  }
}

/**
 * Options for the {@link tables} feature.
 */
export interface TablesOptions {
  /** Whether columns can be resized by dragging their border. @defaultValue `true` */
  resizable?: boolean;
}

/**
 * Tables with header rows, cell merging and column resizing.
 *
 * Commands: `insertTable`, `addRowBefore`, `addRowAfter`, `deleteRow`,
 * `addColumnBefore`, `addColumnAfter`, `deleteColumn`, `toggleHeaderRow`,
 * `mergeOrSplit`, `deleteTable`.
 */
export function tables(options: TablesOptions = {}): OpenEditExtension {
  return defineExtension({
    name: "tables",
    engine: () => TableKit.configure({ table: { resizable: options.resizable ?? true } }),
  });
}

registerFeature("tables", () => tables());
