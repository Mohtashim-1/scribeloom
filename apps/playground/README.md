# Playground

Vite demo app for trying OpenEdit. Three demos share one page:

- **Simple editor**: `<RichTextEditor />` with no configuration.
- **Notion-like editor**: the toolbar slot replaced by a minimal header; the
  slash menu and selection menu do the work.
- **Customized**: theme tokens overridden (level 1) and a custom toolbar
  passed through the `Toolbar` slot (level 2).

```sh
pnpm install
pnpm dev        # from the repo root; builds the packages, then serves on http://localhost:5173
```
