# Getting started

OpenEdit is a set of packages built on the MIT-licensed TipTap core (which
sits on ProseMirror). You can take the whole editor in one component, or only
the parts you need.

## Install

For React, with the default UI:

```sh
npm install @openedit/ui @openedit/react @openedit/core
```

Requires React 18 or newer.

## Your first editor

```tsx
import { RichTextEditor } from "@openedit/ui";
import "@openedit/ui/styles.css";

export function MyEditor() {
  return (
    <RichTextEditor
      content="<p>Hello</p>"
      placeholder="Write something, or type / for commands…"
      onUpdate={(editor) => save(editor.getJSON())}
    />
  );
}
```

That is a complete editor: toolbar, selection menu, slash menu, tables,
images, comments, suggestions, callouts, columns, toggles, a block handle,
and light and dark themes. The stylesheet is self-contained. You do not need
Tailwind, and it does not restyle the rest of your page.

Give it a height and it scrolls inside, with the toolbar pinned:

```css
.oe-root {
  height: 600px;
  overflow-y: auto;
}
```

## Reading and setting content

`onUpdate` receives the editor after every change. Content can be read as
JSON (best for storing), HTML or plain text:

```ts
editor.getJSON();
editor.getHTML();
editor.getText();
editor.setContent("<p>Replaced</p>");
```

`content` is read once, when the editor is created. To load something else
later, call `editor.setContent()`.

To get hold of the editor outside `onUpdate`, create it yourself:

```tsx
import { Editor, useEditor } from "@openedit/react";
import { DefaultUI, defaultFeatures } from "@openedit/ui";

const editor = useEditor({ features: defaultFeatures, content: "<p>Hello</p>" });
return <Editor editor={editor} ui={DefaultUI} />;
```

`useEditor()` returns `null` on the server and on the first render, so it is
safe with server-side rendering.

## Choosing features

`features` lists what the editor can do. Leave it out for the default set, or
pass your own:

```tsx
import { Editor } from "@openedit/react";
import { DefaultUI } from "@openedit/ui";
import "@openedit/extensions/tables";

<Editor features={["basics", "tables"]} ui={DefaultUI} />;
```

The default UI hides controls for features that are off, so the same toolbar
works with any list. See [Features](./features) for all of them.

## Without React

`@openedit/core` has no framework dependency:

```ts
import { createEditor } from "@openedit/core";
import "@openedit/themes/styles.css";

const editor = createEditor({
  element: document.querySelector("#editor"),
  content: "<p>Hello</p>",
});
editor.chain().focus().toggleBold().run();
```

Wrap the mount element in one with the class `oe-root` and give the mount
element itself the class `oe-content` to get the document styles.

## Without the default UI

`<Editor>` from `@openedit/react` is headless unless you pass `ui`. Build your
own interface with `useEditorState()` and the editor's commands, or mix your
components with the default ones. See [Customization](./customization).
