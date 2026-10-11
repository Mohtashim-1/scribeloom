# CLI

Copies UI components into your project, so you can edit them as your own
code. This is customization level 3.

```sh
npx openedit list
npx openedit add toolbar bubble-menu
```

## openedit add &lt;name...&gt;

Copies each component and every file it imports, keeping their folder layout
so the imports between them keep working.

| Option         | Default                   | Meaning                                            |
| -------------- | ------------------------- | -------------------------------------------------- |
| `--dir <path>` | `src/components/openedit` | Where to put the files. Must be inside the project |
| `--overwrite`  | off                       | Replace files that already exist                   |
| `--cwd <path>` | current folder            | Project root                                       |

Existing files are left alone unless you pass `--overwrite`, so running it
again does not undo your edits. Afterwards it lists the npm packages the
copied files import.

## Components

`toolbar`, `bubble-menu`, `slash-menu`, `link-editor`, `table-menu`,
`image-menu`, `comments-sidebar`, `presence`, `ai`, `block-handle`,
`mention-menu`, `math-menu`, `bar`, `default-ui` (everything), and `theme`.

## Styling

The components use Tailwind CSS utility classes that read the OpenEdit
tokens, such as `bg-oe-surface` and `text-oe-muted`. `openedit add theme`
copies the stylesheet that defines those utilities. Import it from your
Tailwind entry and make sure Tailwind scans the folder you copied into.

If you do not use Tailwind, keep importing `@openedit/ui/styles.css`: it
contains every class the stock components use. New classes you add would
then need your own CSS.
