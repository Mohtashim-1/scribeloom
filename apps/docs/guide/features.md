# Features

A feature is enabled by name in `features`, after importing the package that
provides it. `RichTextEditor` enables the ones marked "default" for you.

| Feature         | Import                              |        Default         | What it adds                                                       |
| --------------- | ----------------------------------- | :--------------------: | ------------------------------------------------------------------ |
| `basics`        | built into `@openedit/core`         |          yes           | Text formatting, headings, lists, links, quotes, code blocks, undo |
| `tables`        | `@openedit/extensions/tables`       |          yes           | Tables with header rows, merging and column resizing               |
| `images`        | `@openedit/extensions/images`       |          yes           | Images by file picker, paste or drop, with resizing                |
| `slash-menu`    | `@openedit/extensions/slash-menu`   |          yes           | The `/` command menu                                               |
| `comments`      | `@openedit/extensions/comments`     |          yes           | Comment threads anchored to text                                   |
| `suggestions`   | `@openedit/extensions/suggestions`  |          yes           | Suggesting mode with accept and reject                             |
| `callouts`      | `@openedit/extensions/blocks`       |          yes           | Highlighted note, tip and warning boxes                            |
| `columns`       | `@openedit/extensions/blocks`       |          yes           | Blocks side by side                                                |
| `toggles`       | `@openedit/extensions/toggles`      |          yes           | Collapsible sections                                               |
| `block-handle`  | `@openedit/extensions/block-handle` |          yes           | Add, drag, move and delete blocks                                  |
| `mentions`      | `@openedit/extensions/mentions`     | when `mentions` is set | `@` mentions                                                       |
| `ai`            | `@openedit/ai`                      |    when `ai` is set    | AI writing assistance                                              |
| `collab`        | `@openedit/extensions/collab`       |  when `collab` is set  | Real-time collaboration                                            |
| `math`          | `@openedit/extensions/math`         |           no           | LaTeX formulas                                                     |
| `paste-cleanup` | `@openedit/import/paste`            |           no           | Tidies content pasted from Word and Google Docs                    |

`collab` and `math` are larger, so `@openedit/ui` does not import them. Import
them once in your app before using them.

## Basics

Paragraphs, headings, bold, italic, underline, strikethrough, inline code,
highlight, text alignment, links, blockquotes, dividers, bullet, numbered and
task lists, code blocks, undo and redo, and a placeholder.

Markdown shortcuts work as you type: `#` for headings, `-` or `1.` for lists,
`[ ]` for a task, `>` for a quote, and <code>```</code> for a code block.

## Tables

Insert from the toolbar or the slash menu. With the cursor in a table, a
floating menu inserts and deletes rows and columns, toggles the header row,
merges or splits cells and deletes the table. Drag a column border to resize.

## Images

Insert from the toolbar, paste from the clipboard, or drop a file. Drag a
corner to resize. By default the file is embedded in the document as a data
URL, which needs no server but makes documents large. For real use, supply an
upload function:

```ts
import { images } from "@openedit/extensions/images";

features: [
  "basics",
  images({
    upload: async (file) => {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      return (await response.json()).url;
    },
    maxFileSize: 5 * 1024 * 1024,
    onError: (error) => toast(error.message),
  }),
];
```

Only `image/*` files up to `maxFileSize` (10 MB by default) are accepted.

## Slash menu

Type `/` and keep typing to search. Arrow keys move, Enter picks, Escape
closes. Features add their own entries (tables, callouts, AI and so on) when
they are enabled. To change the list:

```ts
import { slashMenu } from "@openedit/extensions/slash-menu";

slashMenu({
  items: (defaults) => [
    ...defaults.filter((item) => item.id !== "image"),
    {
      id: "date",
      title: "Today's date",
      group: "Insert",
      keywords: ["now"],
      run: (editor) => editor.chain().focus().insertContent(new Date().toDateString()).run(),
    },
  ],
});
```

## Blocks

- **Callouts** hold any blocks in a coloured box. Types: `info`, `success`,
  `warning`, `danger`. Commands: `setCallout(type)`, `unsetCallout()`.
- **Columns** place two to four columns side by side; they stack on narrow
  screens. Commands: `setColumns(count)`, `unsetColumns()`.
- **Toggles** are a summary line with content that folds away. Whether one is
  open is saved with the document.
- **The block handle** appears beside the block under the pointer. The `+`
  adds a block below. The grip drags the block somewhere else, or opens a
  menu to turn it into another type, duplicate, move or delete it. Without a
  pointer, <kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd>
  moves the current block.

## Mentions

Supply the people who can be mentioned. The function may be async, for a
server-side search:

```tsx
<RichTextEditor
  mentions={{
    items: async (query) => {
      const response = await fetch(`/api/users?q=${encodeURIComponent(query)}`);
      return response.json(); // [{ id, label, description? }]
    },
  }}
/>
```

## Math

Formulas are written in LaTeX and rendered with KaTeX. Click one to edit it.

```ts
import "@openedit/extensions/math";
import "katex/dist/katex.min.css";

<RichTextEditor features={[...defaultFeatures, "math"]} />;
```

## Writing your own feature

`defineExtension` wraps engine (TipTap) extensions as an OpenEdit feature:

```ts
import { defineExtension } from "@openedit/core";
import { Typography } from "@tiptap/extension-typography";

const typography = defineExtension({ name: "typography", engine: () => Typography });

<Editor features={["basics", typography]} />;
```

Use only MIT-licensed extensions. `editor.engine` gives you the underlying
TipTap editor when you need something the OpenEdit API does not cover; code
that uses it is tied to that engine.
