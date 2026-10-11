# @openedit/react

React bindings. Requires React 18 or newer.

## `<Editor>`

Takes every `createEditor` option except `element`, plus:

| Prop            | Meaning                                                      |
| --------------- | ------------------------------------------------------------ |
| `ui`            | Slot components to render. Without it the editor is headless |
| `theme`         | `"light"`, `"dark"` or `"system"` (default)                  |
| `onThemeChange` | Called when the UI changes the theme                         |
| `editor`        | An existing editor to render, instead of creating one        |
| `className`     | Class for the root element                                   |
| `children`      | Rendered inside the root; can use `useEditorContext()`       |

`features`, `content`, `placeholder`, `label` and `autofocus` are read once.
`editable`, `onUpdate`, `ui` and `theme` follow the latest render.

Slots: `Toolbar`, `BubbleMenu`, `SlashMenu`, `TableMenu`, `ImageMenu`,
`Sidebar`, `BlockHandle`, `MentionMenu`, `MathMenu`, `AIPanel`. Each receives
`{ editor }`.

## useEditor(options, deps?)

Creates an editor for the component's lifetime and destroys it on unmount.
Returns `null` on the server and on the first render. Pass `deps` to recreate
it when something changes.

## useEditorState(editor, selector)

Subscribes to a slice of editor state. The component re-renders only when
the selected value changes (compared shallowly).

```tsx
const state = useEditorState(editor, (e) => ({
  bold: e.isActive("bold"),
  canUndo: e.can().undo(),
}));
```

## `<EditorContent editor={editor}>`

Renders an editor's editable area on its own.

## useEditorContext()

Inside `<Editor>`: `{ editor, root, theme, resolvedTheme, setTheme }`. `root`
is the editor's root element. Render floating UI into it, not into
`document.body`, so it inherits the theme tokens.
