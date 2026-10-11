# @openedit/extensions

Open extensions for OpenEdit, built from scratch on MIT libraries. Each one is
headless: it adds behaviour and commands, and `@openedit/ui` (or your own
components) provides the interface.

| Feature name   | Import                             | What it adds                                         |
| -------------- | ---------------------------------- | ---------------------------------------------------- |
| `"tables"`     | `@openedit/extensions/tables`      | Tables: header row, merge / split, column resizing   |
| `"images"`     | `@openedit/extensions/images`      | Images: file picker, paste, drag-and-drop, resizing  |
| `"slash-menu"` | `@openedit/extensions/slash-menu`  | The `/` command menu: query, filtering, keyboard nav |

## Usage

Importing an entry point registers its feature name:

```ts
import { createEditor } from "@openedit/core";
import "@openedit/extensions/tables";

createEditor({ features: ["basics", "tables"] });
```

`import "@openedit/extensions"` registers all three. Use the per-feature
imports to keep the ones you do not use out of your bundle. To pass options,
use the factory instead of the name:

```ts
import { images } from "@openedit/extensions/images";

createEditor({
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
  ],
});
```

## Images

Without an `upload` function, images are embedded in the document as data
URLs. That works with no server, but makes documents large; supply `upload`
for real use. Only `image/*` files up to `maxFileSize` (10 MB by default) are
accepted; anything else goes to `onError`.

- `insertImageFiles(editor, files, position?)` uploads and inserts files.
- `pickImageFiles(editor)` opens the browser's file picker first.

## Slash menu

`getSlashMenu(editor)` returns `{ store, select, setSelectedIndex }`, or `null`
if the feature is off. `store` has `getState()` and `subscribe()`, so it plugs
into React's `useSyncExternalStore`. The state is
`{ open, query, items, selectedIndex, getRect }`.

Change the items with the `items` option:

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

Items with `requires` (for example `"table"`) are hidden when that extension
is not enabled.

## License

MIT
