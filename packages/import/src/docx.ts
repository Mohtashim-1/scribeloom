import type { OpenEditor } from "@openedit/core";
import mammoth from "mammoth";

/*
 * Maps Word styles to elements. "Quote" and "Intense Quote" are built into
 * Word; the others are the names `toDocx` in @openedit/export writes.
 */
const STYLE_MAP = [
  "p[style-name='Quote'] => blockquote > p:fresh",
  "p[style-name='Intense Quote'] => blockquote > p:fresh",
  "p[style-name='Code Block'] => pre:separator('\n')",
  "p[style-name='Horizontal Rule'] => hr",
  "r[style-name='Inline Code'] => code",
];

/**
 * Reshapes the converter's HTML into what the editor expects: images on their
 * own become block images, and paragraphs starting with a ballot box (how
 * task lists are written to Word, which has none) become task lists again.
 */
function tidy(html: string): string {
  if (typeof DOMParser === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("p > img:only-child").forEach((image) => {
    const paragraph = image.parentElement!;
    if (!paragraph.textContent?.trim()) paragraph.replaceWith(image);
  });
  const isTask = (node: Element | null) =>
    node?.tagName === "P" && /^[☐☑☒]\s/.test(node.textContent ?? "");
  for (const paragraph of Array.from(doc.body.querySelectorAll("p"))) {
    if (!paragraph.isConnected || !isTask(paragraph)) continue;
    const list = doc.createElement("ul");
    list.setAttribute("data-type", "taskList");
    paragraph.before(list);
    let current: Element | null = paragraph;
    while (isTask(current)) {
      const next: Element | null = current!.nextElementSibling;
      const item = doc.createElement("li");
      item.setAttribute("data-type", "taskItem");
      item.setAttribute("data-checked", String(!current!.textContent!.startsWith("☐")));
      // Remove the box and its space from the first text node.
      const walker = doc.createTreeWalker(current!, NodeFilter.SHOW_TEXT);
      const first = walker.nextNode();
      if (first) first.textContent = first.textContent!.replace(/^[☐☑☒]\s/, "");
      item.append(current!);
      list.append(item);
      current = next;
    }
  }
  return doc.body.innerHTML;
}

/**
 * Result of {@link docxToHtml}.
 */
export interface DocxImportResult {
  html: string;
  /** Things the converter could not carry over, in plain words. */
  warnings: string[];
}

/**
 * Converts a Word document (`.docx`) to HTML. Headings, lists, tables, links,
 * basic formatting and images come through; images are embedded as data URLs.
 * Page layout, fonts, colours and comments do not.
 *
 * Runs in the browser and in Node. Nothing is uploaded.
 */
export async function docxToHtml(file: Blob | ArrayBuffer | Uint8Array): Promise<DocxImportResult> {
  const bytes =
    file instanceof Blob
      ? await file.arrayBuffer()
      : file instanceof Uint8Array
        ? file.slice().buffer
        : file;
  // mammoth reads `arrayBuffer` in browsers and `buffer` in Node.
  const NodeBuffer = (globalThis as { Buffer?: { from(data: ArrayBuffer): unknown } }).Buffer;
  const input = {
    arrayBuffer: bytes as ArrayBuffer,
    ...(NodeBuffer && { buffer: NodeBuffer.from(bytes as ArrayBuffer) }),
  } as Parameters<typeof mammoth.convertToHtml>[0];
  const result = await mammoth.convertToHtml(input, { styleMap: STYLE_MAP });
  return {
    html: tidy(result.value),
    warnings: result.messages.map((message) => message.message),
  };
}

/**
 * Replaces the document with the content of a Word file.
 *
 * @returns Warnings about content that could not be imported.
 */
export async function importDocx(
  editor: OpenEditor,
  file: Blob | ArrayBuffer | Uint8Array,
): Promise<string[]> {
  const { html, warnings } = await docxToHtml(file);
  if (!editor.isDestroyed) editor.setContent(html);
  return warnings;
}
