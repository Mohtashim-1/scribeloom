# @openedit/core

Framework-agnostic editor core for OpenEdit. A thin adapter over the MIT
TipTap engine: your code talks to `createEditor()` and `defineExtension()`,
not to the engine.

## Usage

```ts
import { createEditor } from "@openedit/core";

const editor = createEditor({
  element: document.querySelector("#editor"),
  features: ["basics"],
  content: "<p>Hello</p>",
  placeholder: "Write something…",
  onUpdate: (editor) => console.log(editor.getJSON()),
});

editor.chain().focus().toggleBold().run();
editor.isActive("bold"); // true
editor.destroy();
```

Leave `element` out to create a detached editor and call `editor.mount(el)`
later. Undo history, keyboard shortcuts and input rules start on mount.

## API

| Export                           | What it does                                           |
| -------------------------------- | ------------------------------------------------------ |
| `createEditor(options)`          | Creates an `OpenEditor`.                               |
| `defineExtension({ name, engine })` | Wraps engine extensions as an OpenEdit extension.   |
| `basics(options)`                | The baseline feature set, as an extension.             |
| `registerFeature(name, factory)` | Makes a feature available by name in `features`.       |

`OpenEditor` has `mount`, `unmount`, `destroy`, `getHTML`, `getJSON`,
`getText`, `setContent`, `setEditable`, `focus`, `commands`, `chain`, `can`,
`isActive`, `has(name)`, `getAttributes(name)` and `on(event, handler)`, which
returns an unsubscribe function. For building UI there are `isFocused`,
`isSelectionEmpty`, `selectedNodeName`, `getSelectionRect()` and
`getNodeRect(name)`. `editor.engine` is the raw TipTap editor, for anything
not covered.

## The `basics` feature

Paragraphs, headings, bold, italic, underline, strike, inline code, highlight,
text alignment, links, blockquote, horizontal rule, bullet / ordered / task
lists, code blocks, undo / redo and a placeholder. Tables, images and the
slash menu live in `@openedit/extensions`.

## Custom extensions

```ts
import { createEditor, defineExtension } from "@openedit/core";
import { Highlight } from "@tiptap/extension-highlight";

const highlight = defineExtension({
  name: "highlight",
  engine: () => Highlight.configure({ multicolor: true }),
});

createEditor({ features: ["basics", highlight] });
```

## Styling

This package ships no CSS. Use `@openedit/themes` for the document styles, or
`@openedit/ui` for the full default interface.

## License

MIT
