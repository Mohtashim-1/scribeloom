# Import and export

Two packages, both optional: `@openedit/export` and `@openedit/import`.
Everything runs in the browser unless noted. Nothing is uploaded.

```sh
npm install @openedit/export @openedit/import
```

## Export

```ts
import {
  download,
  toDocx,
  toHtmlDocument,
  toMarkdown,
  printToPdf,
  DOCX_MIME_TYPE,
} from "@openedit/export";

download(toMarkdown(editor), "document.md", "text/markdown");
download(toHtmlDocument(editor, { title: "Report" }), "document.html", "text/html");
download(await toDocx(editor), "document.docx", DOCX_MIME_TYPE);
await printToPdf(editor, { title: "Report" });
```

| Format   | Function                   | Notes                                                    |
| -------- | -------------------------- | -------------------------------------------------------- |
| JSON     | `editor.getJSON()`         | Lossless. Use this for storage                           |
| HTML     | `toHtml`, `toHtmlDocument` | The second is a full page with embedded styles           |
| Markdown | `toMarkdown`               | CommonMark with GitHub tables, task lists, strikethrough |
| Word     | `toDocx`                   | Returns the `.docx` bytes                                |
| PDF      | `printToPdf`               | Opens the browser's print dialog ("Save as PDF")         |

Every exporter also accepts a JSON document instead of an editor, so they can
run on a server.

### What each format keeps

- **Markdown** cannot express text alignment, image sizes or merged table
  cells, so those are dropped. Underline and highlight are written as inline
  HTML (`<u>`, `<mark>`).
- **Word** keeps headings, alignment, inline formatting, links, nested bullet,
  numbered and task lists, quotes, code blocks, dividers, tables with merged
  cells, and PNG, JPEG, GIF and BMP images. Other image formats, and images
  that cannot be loaded, become a text placeholder. Images that are not
  embedded are fetched, which needs their server to allow it (CORS); pass
  `loadImage` to fetch them your own way.

### PDF on a server

For PDFs without a person at a browser, render the HTML in a headless
browser you run. `htmlToPdf` works with Puppeteer or Playwright:

```ts
import puppeteer from "puppeteer";
import { wrapHtmlDocument } from "@openedit/export";
import { htmlToPdf } from "@openedit/export/server";

const browser = await puppeteer.launch();
const pdf = await htmlToPdf(browser, wrapHtmlDocument(html, { title: "Report" }));
await browser.close();
```

The HTML is loaded as a page, so only render documents you trust or have
sanitised.

## Import

```ts
import {
  importDocx,
  importFile,
  importHtml,
  importMarkdown,
  pickFile,
  IMPORT_ACCEPT,
} from "@openedit/import";

importMarkdown(editor, "# Title\n\n- [x] done");
importHtml(editor, "<h1>Title</h1>");
const warnings = await importDocx(editor, file);

// Or let the user choose a file, and pick the importer by its extension:
const file = await pickFile(IMPORT_ACCEPT);
if (file) await importFile(editor, file);
```

Importing replaces the document. `importDocx` returns warnings about content
it could not carry over; page layout, fonts, colours and Word comments are
not imported.

Whatever the source, content is parsed into the document's own structure, and
anything the editor has no feature for (scripts, event handlers, unknown tags)
is dropped. `markdownToHtml` and `docxToHtml` return raw HTML, which is safe
to load into the editor but should not be put on a page without sanitising.

## Round trips

A document with headings, lists, task lists, tables, quotes, code blocks,
links, formatting and images comes back identical through Markdown, and
through Word apart from a code block's language (Word has no such thing).
Both are checked by the test suite.

## Pasting from Word and Google Docs

Content copied from those tools arrives full of inline styles. The
`paste-cleanup` feature tidies it as it is pasted:

```ts
import "@openedit/import/paste";

<RichTextEditor features={[...defaultFeatures, "paste-cleanup"]} />;
```
