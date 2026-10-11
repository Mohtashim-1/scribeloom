# 7. Import and export: own Markdown writer, named Word styles

Date: 2026-10-12
Status: accepted

## Decision

- **Markdown export is our own serializer** over the document JSON: no
  dependency, deterministic output, and control over nested marks and
  whitespace. Import uses `marked`, then reshapes its HTML (task lists, block
  images) into what the editor expects.
- **Word export uses `docx`; import uses `mammoth`.** Word has no element for
  inline code, block quotes, code blocks or dividers, so export writes them
  with named styles ("Inline Code", "Quote", "Code Block", "Horizontal Rule")
  and import maps those names back. Task lists are written as paragraphs
  starting with a ballot box and rebuilt on import.
- **PDF has two paths.** In the browser, the print dialog. On a server,
  `htmlToPdf` takes a browser object from Puppeteer or Playwright, so we do
  not depend on either (they download a browser on install).
- **Exporters accept JSON as well as an editor**, so they run without a DOM.
- **Both packages are separate from the UI** and meant to be loaded on demand.

## Trade-offs

- Markdown drops alignment, image sizes and merged cells; underline and
  highlight become inline HTML.
- Word export embeds PNG, JPEG, GIF and BMP only. Other formats become a text
  placeholder.
- `docx` brings in `sax` under BlueOak-1.0.0, a permissive licence outside the
  project's stated list. Recorded in `THIRD_PARTY_LICENSES.md`.
- Markdown import and paste cleanup need a DOM, so they are browser-only.
