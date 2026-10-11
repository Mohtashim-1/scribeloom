# Performance and size

## Bundle size

Minified and gzipped, without React (your app already has it). Measured with
`node scripts/bundle-size.mjs` in the repository.

| What you import                                 |   Size |
| ----------------------------------------------- | -----: |
| Base editor: `@openedit/react`, basics only     | 121 KB |
| `@openedit/core` alone, no framework            | 120 KB |
| `RichTextEditor` with its default features      | 208 KB |
| + collaboration (`@openedit/extensions/collab`) | +47 KB |

Most of the base is the editing engine (ProseMirror and TipTap).

Things that keep it down:

- **Features are separate imports.** `@openedit/extensions/tables`,
  `/images`, `/collab` and so on. Import only what you use. Importing
  `@openedit/extensions` itself pulls in all of them.
- **Collaboration and math are opt-in**, even with `RichTextEditor`.
- **Export and import are separate packages.** Load them on demand, since
  Word support is large:

  ```ts
  const { toDocx } = await import("@openedit/export");
  ```

## Long documents

Typing in a document of plain paragraphs, in a production build, in Chrome on
a desktop machine. "Handling" is the time the editor spends on a keystroke;
the rest is the browser laying out and painting.

| Paragraphs | Handling | To the next frame |
| ---------: | -------: | ----------------: |
|         20 |     1 ms |             17 ms |
|      2,000 |     1 ms |             17 ms |
|      5,000 |     3 ms |             23 ms |

The default UI adds almost nothing over the bare engine at any of these
sizes. To measure on your own hardware, build the playground, serve
`apps/playground/dist`, and run `node e2e/perf.mjs <url>`.

Advice:

- **Do not serialise the document on every keystroke.** `getHTML()` and
  `getJSON()` walk the whole document. Debounce saving, or save on blur.
- **Use `useEditorState` with a narrow selector.** It re-renders only when
  the selected value changes.
- Development builds are several times slower than production. Measure a
  production build.
- Very large documents are limited by the browser rendering one long page.
  There is no virtual scrolling.
