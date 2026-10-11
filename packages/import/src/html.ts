import type { OpenEditor } from "@openedit/core";
import { cleanPastedHtml, needsCleanup } from "./paste";

/**
 * Replaces the document with HTML. Markup from Word or Google Docs is tidied
 * first. Anything the editor has no feature for (scripts, unknown tags and
 * attributes) is dropped as the HTML is parsed into the document.
 */
export function importHtml(editor: OpenEditor, html: string): void {
  editor.setContent(needsCleanup(html) ? cleanPastedHtml(html) : html);
}
