import type { OpenEditor } from "@openedit/core";
import { toHtmlDocument, type HtmlDocumentOptions } from "./html";

/**
 * Opens the browser's print dialog for the document, where the user can
 * choose "Save as PDF". Works with no server; the result depends on the
 * browser. For PDFs generated without a person, see `htmlToPdf` in
 * `@openedit/export/server`.
 *
 * @returns A promise that settles once the print dialog has been opened.
 */
export function printToPdf(editor: OpenEditor, options: HtmlDocumentOptions = {}): Promise<void> {
  const html = toHtmlDocument(editor, options);
  return new Promise((resolve, reject) => {
    // A hidden frame, so the page around the editor is not printed.
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    frame.onload = () => {
      const target = frame.contentWindow;
      if (!target) {
        frame.remove();
        reject(new Error("Could not open the print frame."));
        return;
      }
      target.addEventListener("afterprint", () => frame.remove(), { once: true });
      // Give images a moment to decode before the dialog captures the page.
      setTimeout(() => {
        target.focus();
        target.print();
        resolve();
      }, 50);
    };
    frame.srcdoc = html;
    document.body.append(frame);
  });
}
