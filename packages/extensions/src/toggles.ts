import { defineExtension, registerFeature, type OpenEditExtension } from "@openedit/core";
import { Extension } from "@tiptap/core";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import type { SlashMenuItem } from "./slash-menu";

declare module "@openedit/core" {
  interface FeatureRegistry {
    toggles: true;
  }
}

/**
 * Toggle blocks: a summary line with content that can be collapsed.
 * Commands: `setDetails()`, `unsetDetails()`.
 */
export function toggles(): OpenEditExtension {
  return defineExtension({
    name: "toggles",
    engine: () => [
      Details.configure({
        // Whether a toggle is open is saved with the document.
        persist: true,
        HTMLAttributes: { class: "oe-toggle" },
      }),
      DetailsSummary,
      DetailsContent,
      Extension.create({
        name: "toggleSlashItems",
        addStorage: (): { slashItems: SlashMenuItem[] } => ({
          slashItems: [
            {
              id: "toggle",
              title: "Toggle",
              description: "Collapsible section",
              group: "Blocks",
              keywords: ["details", "collapse", "accordion", "fold"],
              run: (editor) => editor.chain().focus().setDetails().run(),
            },
          ],
        }),
      }),
    ],
  });
}

registerFeature("toggles", () => toggles());
