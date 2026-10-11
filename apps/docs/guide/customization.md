# Customization

There are three levels, from a one-line change to owning the code.

## Level 1: theme tokens

Every colour, radius, font and width is a CSS variable on `.oe-root`.
Override the ones you want:

```css
.oe-root {
  --oe-accent: #0f766e;
  --oe-radius: 3px;
  --oe-font: Georgia, serif;
  --oe-content-width: 760px;
}

.oe-root[data-oe-theme="dark"] {
  --oe-accent: #5eead4;
}
```

To change one editor only, give it a class and set the variables there:

```tsx
<RichTextEditor className="brand" />
```

| Token                                                               | Controls                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------- |
| `--oe-bg`, `--oe-surface`                                           | Editor background; floating panels                   |
| `--oe-fg`, `--oe-muted`, `--oe-faint`                               | Text, secondary text, placeholder                    |
| `--oe-border`, `--oe-border-strong`                                 | Dividers; table and input borders                    |
| `--oe-accent`, `--oe-accent-fg`                                     | Links, active buttons, focus rings                   |
| `--oe-hover`, `--oe-active`                                         | Button hover and pressed backgrounds                 |
| `--oe-highlight`, `--oe-selection`                                  | Highlighted text; the text selection                 |
| `--oe-comment`, `--oe-insert`, `--oe-delete`                        | Comment highlight; suggested additions and deletions |
| `--oe-code-bg`, `--oe-code-fg`                                      | Inline code and code blocks                          |
| `--oe-radius`, `--oe-shadow`                                        | Corner radius; floating panel shadow                 |
| `--oe-font`, `--oe-font-mono`, `--oe-font-size`, `--oe-line-height` | Typography                                           |
| `--oe-content-width`, `--oe-content-padding`                        | Document column                                      |

### Light and dark

The `theme` prop is `"light"`, `"dark"` or `"system"` (the default, which
follows the operating system):

```tsx
const [theme, setTheme] = useState<EditorTheme>("system");

<RichTextEditor theme={theme} onThemeChange={setTheme} />;
```

`onThemeChange` fires when the user presses the theme toggle in the toolbar.

## Level 2: replace a part

Each part of the UI is a slot. Pass your own component, or `undefined` to
remove one.

| Slot                                 | Default component                        |
| ------------------------------------ | ---------------------------------------- |
| `Toolbar`                            | The fixed toolbar                        |
| `BubbleMenu`                         | Floating menu on a text selection        |
| `SlashMenu`                          | The `/` command menu                     |
| `TableMenu`, `ImageMenu`             | Controls for the table or image in focus |
| `Sidebar`                            | Comments and suggestions                 |
| `BlockHandle`                        | Handle beside the hovered block          |
| `MentionMenu`, `MathMenu`, `AIPanel` | Menus for those features                 |

A slot component receives `{ editor }`. The parts the default toolbar is made
of are exported, so a custom one is short:

```tsx
import { ActionButton, actions, Bar, LinkButton, RichTextEditor } from "@openedit/ui";
import type { EditorUIProps } from "@openedit/react";

function MyToolbar({ editor }: EditorUIProps) {
  return (
    <Bar aria-label="Formatting">
      <ActionButton editor={editor} action={actions.bold} />
      <ActionButton editor={editor} action={actions.italic} />
      <LinkButton editor={editor} />
    </Bar>
  );
}

<RichTextEditor ui={{ Toolbar: MyToolbar }} />;
```

To add to the default toolbar instead of replacing it, pass children:

```tsx
import { Toolbar } from "@openedit/ui";

<RichTextEditor
  ui={{
    Toolbar: (props) => (
      <Toolbar {...props}>
        <MyButton />
      </Toolbar>
    ),
  }}
/>;
```

### Your own actions

An action is a plain object, which `ActionButton` and `ActionMenu` render:

```tsx
import { Eraser } from "lucide-react";
import type { EditorAction } from "@openedit/ui";

const clearFormatting: EditorAction = {
  id: "clear-formatting",
  label: "Clear formatting",
  icon: Eraser,
  run: (editor) => editor.chain().focus().unsetAllMarks().clearNodes().run(),
};
```

### Building a component from scratch

The default components are thin layers over headless hooks, which you can use
directly:

```tsx
import { useEditorState } from "@openedit/react";

function WordCount({ editor }: EditorUIProps) {
  const words = useEditorState(editor, (e) => e.getText().split(/\s+/).filter(Boolean).length);
  return <span>{words} words</span>;
}
```

`useEditorState` re-renders only when the selected value changes. Inside the
editor, `useEditorContext()` gives you the editor, its root element, and the
theme.

## Level 3: own the code

Copy a component's source into your project and edit it as your own:

```sh
npx openedit add toolbar
```

This copies the component and everything it imports into
`src/components/openedit`, and lists the packages those files need. Then
point the slot at your copy:

```tsx
import { DefaultUI } from "@openedit/ui";
import { Toolbar } from "./components/openedit/components/toolbar";

<Editor ui={{ ...DefaultUI, Toolbar }} />;
```

The copied components are styled with Tailwind CSS utilities that read the
tokens above. Run `npx openedit add theme` for the stylesheet that defines
them, import it in your CSS, and make sure Tailwind scans the folder. See the
[CLI reference](../reference/cli).

Copied code is yours: it will not change when you update OpenEdit.
