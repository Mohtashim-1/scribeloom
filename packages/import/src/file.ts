import type { OpenEditor } from "@openedit/core";
import { importDocx } from "./docx";
import { importHtml } from "./html";
import { importMarkdown } from "./markdown";

/**
 * Opens the browser's file picker.
 *
 * @param accept - File types to offer, as for `<input accept>`.
 * @returns The chosen file, or `null` if the dialog was dismissed.
 */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

/** File types {@link importFile} understands, for a file picker. */
export const IMPORT_ACCEPT = ".docx,.md,.markdown,.txt,.html,.htm";

/**
 * Replaces the document with the content of a file, choosing the importer by
 * its extension: `.docx`, `.md` / `.markdown` / `.txt`, or `.html` / `.htm`.
 *
 * @returns Warnings about content that could not be imported.
 * @throws If the file type is not supported.
 */
export async function importFile(editor: OpenEditor, file: File): Promise<string[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "docx") return importDocx(editor, file);
  if (extension === "md" || extension === "markdown" || extension === "txt") {
    importMarkdown(editor, await file.text());
    return [];
  }
  if (extension === "html" || extension === "htm") {
    importHtml(editor, await file.text());
    return [];
  }
  throw new Error(`Cannot import "${file.name}": unsupported file type.`);
}
