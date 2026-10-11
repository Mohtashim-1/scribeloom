# @openedit/extensions

Open features for OpenEdit, built from scratch on MIT libraries. Each is
headless: it adds behaviour, commands and state, and `@openedit/ui` (or your
own components) provides the interface.

| Feature name   | Import                              | What it adds |
| -------------- | ----------------------------------- | ------------ |
| `tables`       | `@openedit/extensions/tables`       | Tables: header row, merge / split, column resizing |
| `images`       | `@openedit/extensions/images`       | Images: file picker, paste, drop, resizing |
| `slash-menu`   | `@openedit/extensions/slash-menu`   | The `/` command menu |
| `comments`     | `@openedit/extensions/comments`     | Comment threads anchored to text |
| `suggestions`  | `@openedit/extensions/suggestions`  | Suggesting mode with accept and reject |
| `callouts`, `columns` | `@openedit/extensions/blocks` | Note boxes; blocks side by side |
| `toggles`      | `@openedit/extensions/toggles`      | Collapsible sections |
| `block-handle` | `@openedit/extensions/block-handle` | Add, drag, move and delete blocks |
| `mentions`     | `@openedit/extensions/mentions`     | `@` mentions |
| `math`         | `@openedit/extensions/math`         | LaTeX formulas (KaTeX) |
| `collab`       | `@openedit/extensions/collab`       | Real-time collaboration, cursors, presence, offline |

## Usage

Importing an entry point registers its feature name:

```ts
import { createEditor } from "@openedit/core";
import "@openedit/extensions/tables";

createEditor({ features: ["basics", "tables"] });
```

Use the per-feature imports. `import "@openedit/extensions"` registers all of
them, and brings all of them (including collaboration and math) into your
bundle.

To pass options, use the factory instead of the name:

```ts
import { images } from "@openedit/extensions/images";

createEditor({ features: ["basics", images({ upload: uploadToMyServer })] });
```

## Building your own UI

Each interactive feature has a getter that returns a handle with a `store`
(`getState()`, `subscribe()`) and methods, or `null` when the feature is off:
`getSlashMenu`, `getMentions`, `getComments`, `getSuggestions`, `getCollab`,
`getBlockHandle`, `getMath`.

```ts
import { getComments } from "@openedit/extensions/comments";

const comments = getComments(editor);
comments?.addThread("Is this right?");
comments?.store.subscribe(() => render(comments.store.getState().threads));
```

## Things to know

- **Images** are embedded as data URLs unless you supply `upload`. That needs
  no server but makes documents large.
- **Collaboration** needs a server; see `apps/collab-server`. Names and
  colours of other people come from their browsers: they are validated, but
  treat them as user input.
- **Comments** are stored in the shared document when collaboration is on,
  otherwise in memory. Use `memoryCommentsAdapter({ onChange })` or
  `restCommentsAdapter({ url })` to keep them.
- **Suggestions** track typing, deleting and replacing text within a block.
  Structural and formatting changes are applied directly.
- **Math** needs KaTeX's stylesheet: `import "katex/dist/katex.min.css"`.

Full documentation: [features](../../apps/docs/guide/features.md),
[collaboration](../../apps/docs/guide/collaboration.md),
[comments and suggestions](../../apps/docs/guide/comments.md) and the
[reference](../../apps/docs/reference/extensions.md).

## License

MIT
