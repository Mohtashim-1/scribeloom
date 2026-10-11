# @openedit/ui

The default OpenEdit interface: toolbar, floating selection menu, `/` command
menu, link editing, and table and image controls, in light and dark.

Built with Radix UI primitives, Floating UI and lucide icons. Requires React
18 or newer.

## Usage

```tsx
import { RichTextEditor } from "@openedit/ui";
import "@openedit/ui/styles.css";

<RichTextEditor
  content="<p>Hello</p>"
  placeholder="Write something, or type / for commands…"
  onUpdate={(editor) => save(editor.getJSON())}
/>;
```

`RichTextEditor` is `<Editor>` from `@openedit/react` with the features
`basics`, `tables`, `images` and `slash-menu`, and every UI slot filled. It
takes the same props. The stylesheet is self-contained: you do not need
Tailwind, and it does not reset or restyle the rest of your page.

Give the editor a height and it scrolls inside, with the toolbar pinned:

```css
.oe-root {
  height: 600px;
  overflow-y: auto;
}
```

## Customizing

### Level 1: theme tokens

Override CSS variables on `.oe-root`. See `@openedit/themes` for the list.

```css
.oe-root {
  --oe-accent: #0f766e;
  --oe-radius: 3px;
  --oe-font: Georgia, serif;
}
```

### Level 2: replace a part

Each part of the UI is a slot: `Toolbar`, `BubbleMenu`, `SlashMenu`,
`TableMenu`, `ImageMenu`. Pass your own component, or `undefined` to remove
one. The parts the default toolbar is made of are exported, so a custom one is
short:

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

### Level 3: own the code

Copying component source into your project with `npx openedit add` arrives in
a later milestone.

## Building blocks

| Export                                    | What it is                                                   |
| ----------------------------------------- | ------------------------------------------------------------ |
| `RichTextEditor`                          | The batteries-included editor                                |
| `DefaultUI`, `defaultFeatures`            | The slot set and feature list it uses                        |
| `Toolbar`, `BubbleMenu`, `SlashMenu`, `TableMenu`, `ImageMenu` | The default slot components             |
| `Bar`, `BarButton`, `BarSeparator`        | A toolbar row (arrow-key navigation), its buttons, a divider |
| `actions`, `ActionButton`, `ActionMenu`   | Built-in actions; a button or dropdown bound to them         |
| `LinkButton`, `LinkEditor`, `ThemeToggle` | Link popover, its form, and the light / dark switch          |
| `useActionState`, `useAnchoredPosition`, `useSlashMenu`, ... | The headless hooks the components use     |
| `normalizeUrl`, `applyLink`, `removeLink` | Link helpers                                                 |

Controls for a feature that is not enabled hide themselves, so the same
toolbar works with any feature list.

## Good to know

- Links typed by users are cleaned up before they are applied: `example.com`
  becomes `https://example.com`, and schemes other than `http`, `https`,
  `mailto` and `tel` (for example `javascript:`) are rejected.
- Floating menus render inside the editor's root element, so they pick up
  your theme tokens.
- The components are styled with Tailwind utility classes that reference the
  tokens (`bg-oe-surface`, `text-oe-muted`, ...). The published stylesheet has
  them precompiled, without Tailwind's reset.

## License

MIT
