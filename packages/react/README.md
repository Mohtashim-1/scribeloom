# @openedit/react

React bindings for OpenEdit. Requires React 18 or newer.

## Usage

The one-liner:

```tsx
import { Editor } from "@openedit/react";

<Editor
  content="<p>Hello</p>"
  placeholder="Write something…"
  onUpdate={(editor) => save(editor.getJSON())}
/>;
```

With access to the editor, for example to build a toolbar:

```tsx
import { EditorContent, useEditor, useEditorState } from "@openedit/react";

function MyEditor() {
  const editor = useEditor({ content: "<p>Hello</p>" });
  const state = useEditorState(editor, (e) => ({ bold: e.isActive("bold") }));

  return (
    <>
      <button
        aria-pressed={state?.bold}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        Bold
      </button>
      <EditorContent editor={editor} />
    </>
  );
}
```

## UI slots and theme

`<Editor>` is headless by default. Pass `ui` to render components around the
document; each slot gets `{ editor }`. `@openedit/ui` has a ready-made set.

```tsx
import { Editor, type EditorUIProps } from "@openedit/react";
import { DefaultUI } from "@openedit/ui";

function MyToolbar({ editor }: EditorUIProps) {
  return <button onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>;
}

<Editor ui={{ ...DefaultUI, Toolbar: MyToolbar }} theme="dark" />;
```

Slots: `Toolbar`, `BubbleMenu`, `SlashMenu`, `TableMenu`, `ImageMenu`.

`theme` is `"light"`, `"dark"` or `"system"` (the default). It sets
`data-oe-theme` on the root element, which the `@openedit/themes` tokens key
off. Components inside the editor read and change it with
`useEditorContext()`.

## API

| Export                             | What it does                                                        |
| ---------------------------------- | ------------------------------------------------------------------- |
| `<Editor />`                       | Creates and renders an editor. Takes the `createEditor()` options.  |
| `<EditorContent editor={editor} />` | Renders an existing editor's editable area.                        |
| `useEditor(options, deps?)`        | Creates an editor for the component's lifetime.                     |
| `useEditorState(editor, selector)` | Re-renders only when the selected slice of editor state changes.    |
| `useEditorContext()`               | Inside `<Editor>`: the editor, root element, theme and `setTheme`.  |

Things to know:

- `useEditor()` returns `null` on the first render and on the server; the
  editor is created in a layout effect, before the first paint. This makes it
  safe for SSR and StrictMode. Slot components only render once it exists.
- `features`, `content`, `placeholder` and `autofocus` are read once. To
  recreate the editor when something changes, pass `deps`. `editable`,
  `onUpdate`, `ui` and `theme` always follow the latest render.
- To change content later, call `editor.setContent()`.

## License

MIT
