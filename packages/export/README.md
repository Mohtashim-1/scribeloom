# @openedit/export

Export OpenEdit documents to Markdown, HTML, Word (`.docx`) and PDF. Runs in
the browser and in Node; nothing is uploaded.

```ts
import { download, toDocx, toMarkdown, DOCX_MIME_TYPE } from "@openedit/export";

download(toMarkdown(editor), "document.md", "text/markdown");
download(await toDocx(editor), "document.docx", DOCX_MIME_TYPE);
```

| Export | Meaning |
| ------ | ------- |
| `toMarkdown(source)` | CommonMark with GitHub tables, task lists and strikethrough |
| `toHtml(editor)`, `toHtmlDocument(editor, options)` | A fragment, or a complete styled page |
| `toDocx(source, options)` | The bytes of a Word file |
| `printToPdf(editor, options)` | Opens the browser's print dialog |
| `htmlToPdf(browser, html, options)` | From `@openedit/export/server`: PDF via Puppeteer or Playwright |
| `download(content, filename, type)` | Saves a file in the browser |

`source` is an editor or a JSON document, so the exporters also work on a
server.

Word support is large. Load this package on demand:

```ts
const { toDocx } = await import("@openedit/export");
```

What each format keeps, and the server-side PDF helper, are covered in the
[import and export guide](../../apps/docs/guide/import-export.md).

## License

MIT
