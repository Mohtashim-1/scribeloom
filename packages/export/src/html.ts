import type { OpenEditor } from "@openedit/core";

/**
 * Options for {@link toHtmlDocument}.
 */
export interface HtmlDocumentOptions {
  /** Used for `<title>`. @defaultValue `"Document"` */
  title?: string;
  /** CSS to embed. @defaultValue {@link defaultDocumentCss} */
  css?: string;
  /** `lang` attribute of the page. @defaultValue `"en"` */
  lang?: string;
}

/** Plain, print-friendly styling for exported documents. */
export const defaultDocumentCss = `
body { max-width: 720px; margin: 40px auto; padding: 0 24px; color: #1c1c21;
  font: 16px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
h1, h2, h3 { line-height: 1.25; margin: 1.6em 0 0.5em; }
a { color: #4338ca; }
img { max-width: 100%; height: auto; }
blockquote { margin: 1.1em 0; padding-left: 1em; border-left: 3px solid #1c1c21; }
code { padding: 0.1em 0.35em; border-radius: 4px; background: #f3f3f5; font-size: 0.88em; }
pre { padding: 14px 16px; border-radius: 8px; background: #f3f3f5; overflow-x: auto; }
pre code { padding: 0; background: none; }
mark { background: #fdf0a6; }
hr { border: 0; border-top: 1px solid #dcdce0; margin: 2em 0; }
table { width: 100%; border-collapse: collapse; }
td, th { padding: 7px 10px; border: 1px solid #c9c9cf; text-align: left; vertical-align: top; }
th { background: #f3f3f5; }
td > p, th > p { margin: 0; }
ul[data-type="taskList"] { padding-left: 0; list-style: none; }
ul[data-type="taskList"] li { display: flex; gap: 0.5em; }
ul[data-type="taskList"] li > div > p { margin: 0.2em 0; }
@media print { body { margin: 0 auto; } pre, blockquote, table, img { break-inside: avoid; } }
`.trim();

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!,
  );
}

/** The document's HTML, as a fragment (no `<html>` wrapper). */
export function toHtml(editor: OpenEditor): string {
  return editor.getHTML();
}

/**
 * The document as a complete, self-contained HTML page with embedded styles.
 */
export function toHtmlDocument(editor: OpenEditor, options: HtmlDocumentOptions = {}): string {
  return wrapHtmlDocument(editor.getHTML(), options);
}

/** Wraps an HTML fragment into a complete page. */
export function wrapHtmlDocument(body: string, options: HtmlDocumentOptions = {}): string {
  return `<!doctype html>
<html lang="${escapeHtml(options.lang ?? "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title ?? "Document")}</title>
<style>${options.css ?? defaultDocumentCss}</style>
</head>
<body>
${body}
</body>
</html>
`;
}
