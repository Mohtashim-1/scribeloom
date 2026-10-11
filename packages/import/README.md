# @openedit/import

Import Markdown, HTML and Word (`.docx`) into OpenEdit, and tidy content
pasted from Word and Google Docs.

```ts
import { importFile, importMarkdown, pickFile, IMPORT_ACCEPT } from "@openedit/import";

importMarkdown(editor, "# Title\n\n- [x] done");

const file = await pickFile(IMPORT_ACCEPT);
if (file) await importFile(editor, file); // picks the importer by extension
```

| Export | Meaning |
| ------ | ------- |
| `importMarkdown`, `importHtml`, `importDocx` | Replace the document with that content |
| `importFile(editor, file)` | Chooses by file extension |
| `markdownToHtml`, `docxToHtml` | Convert without an editor |
| `cleanPastedHtml`, `pasteCleanup()` | The paste cleaner, and the `paste-cleanup` feature |

Imported content is parsed into the document's own structure; scripts, event
handlers and unknown tags are dropped. `markdownToHtml` and `docxToHtml`
return raw HTML: safe to load into the editor, not safe to put on a page
without sanitising.

Needs a DOM for Markdown and paste cleanup, so run those in the browser.

See the [import and export guide](../../apps/docs/guide/import-export.md).

## License

MIT
