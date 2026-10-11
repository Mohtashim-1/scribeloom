import type { OpenEditor } from "@openedit/core";
import { marked } from "marked";

/**
 * Converts Markdown (CommonMark plus GitHub tables, task lists and
 * strikethrough) to HTML shaped the way the editor expects.
 *
 * The result is **not sanitised**: Markdown may contain raw HTML. It is safe
 * to load into the editor, which only keeps what its features understand, but
 * do not put it on a page yourself without sanitising it.
 *
 * Needs a DOM (`DOMParser`), so run it in the browser.
 */
export function markdownToHtml(markdown: string): string {
  const html = marked.parse(markdown, { gfm: true, async: false });
  const doc = new DOMParser().parseFromString(html, "text/html");

  // GitHub task lists arrive as <li><input type="checkbox"> text</li>.
  doc
    .querySelectorAll("li > input[type=checkbox], li > p:first-child > input[type=checkbox]")
    .forEach((box) => {
      const item = box.closest("li")!;
      const list = item.parentElement!;
      list.setAttribute("data-type", "taskList");
      item.setAttribute("data-type", "taskItem");
      item.setAttribute("data-checked", String((box as HTMLInputElement).checked));
      const holder = box.parentElement!;
      box.remove();
      // Drop the space that followed the checkbox.
      const first = holder.firstChild;
      if (first?.nodeType === Node.TEXT_NODE)
        first.textContent = first.textContent!.replace(/^\s+/, "");
    });

  // The fenced code block's closing line break is not part of the code.
  doc.querySelectorAll("pre > code").forEach((code) => {
    code.textContent = code.textContent!.replace(/\n$/, "");
  });

  // An image alone in a paragraph is a block image.
  doc.querySelectorAll("p > img:only-child").forEach((image) => {
    const paragraph = image.parentElement!;
    if (!paragraph.textContent?.trim()) paragraph.replaceWith(image);
  });

  return doc.body.innerHTML;
}

/** Replaces the document with Markdown content. */
export function importMarkdown(editor: OpenEditor, markdown: string): void {
  editor.setContent(markdownToHtml(markdown));
}
