# OpenEdit without a framework

`@openedit/core` and `@openedit/themes`, with plain DOM buttons. No React.
Vite is used only to bundle the packages for the browser.

```sh
pnpm install && pnpm build      # once, from the repository root
pnpm --filter example-vanilla dev
```

What to look at in `src/main.ts`:

- `createEditor({ element })` mounts the editor.
- Buttons run commands with `editor.chain().focus()...run()`.
- `editor.on("transaction", render)` keeps the buttons in step with the
  selection, using `editor.isActive()` and `editor.can()`.
- The theme is the `data-oe-theme` attribute on the `.oe-root` element.
