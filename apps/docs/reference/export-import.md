# @openedit/export and @openedit/import

See the [guide](../guide/import-export) for usage.

## @openedit/export

Every function takes an editor or a JSON document.

| Export                                         | Returns               | Meaning                      |
| ---------------------------------------------- | --------------------- | ---------------------------- |
| `toMarkdown(source)`                           | `string`              | Markdown                     |
| `toHtml(editor)`                               | `string`              | HTML fragment                |
| `toHtmlDocument(editor, { title, css, lang })` | `string`              | A complete page              |
| `wrapHtmlDocument(html, options)`              | `string`              | Wraps a fragment into a page |
| `toDocx(source, { title, loadImage })`         | `Promise<Uint8Array>` | A Word file                  |
| `printToPdf(editor, options)`                  | `Promise<void>`       | Opens the print dialog       |
| `download(content, filename, type?)`           |                       | Saves a file in the browser  |
| `DOCX_MIME_TYPE`, `defaultDocumentCss`         |                       | Constants                    |

From `@openedit/export/server`: `htmlToPdf(browser, html, { format, margin,
printBackground, landscape })` returns the PDF bytes. `browser` is a Puppeteer
or Playwright browser.

Entry points `/markdown`, `/html`, `/docx`, `/pdf` and `/server` let you
import one exporter without the others.

## @openedit/import

| Export                                         | Meaning                                                   |
| ---------------------------------------------- | --------------------------------------------------------- |
| `importMarkdown(editor, markdown)`             | Replace the document with Markdown                        |
| `importHtml(editor, html)`                     | Replace it with HTML, tidying Word and Google Docs markup |
| `importDocx(editor, file)`                     | Replace it with a Word file. Returns warnings             |
| `importFile(editor, file)`                     | Picks the importer by file extension                      |
| `pickFile(accept)`, `IMPORT_ACCEPT`            | A file picker, and the types to offer                     |
| `markdownToHtml(markdown)`, `docxToHtml(file)` | Convert without touching an editor                        |
| `cleanPastedHtml(html)`, `needsCleanup(html)`  | The paste cleaner, on its own                             |
| `pasteCleanup()`                               | The `paste-cleanup` feature                               |

`importDocx` and `docxToHtml` accept a `Blob`, an `ArrayBuffer` or a
`Uint8Array`. `markdownToHtml`, `cleanPastedHtml` and the DOCX tidy-up need a
DOM, so run them in the browser.
