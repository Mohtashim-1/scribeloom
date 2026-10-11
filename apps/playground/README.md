# Playground

Vite demo app for trying OpenEdit. Four demos share one page:

- **Simple editor**: `<RichTextEditor />` with no configuration.
- **Notion-like editor**: the toolbar slot replaced by a minimal header; the
  slash menu and selection menu do the work.
- **Customized**: theme tokens overridden (level 1) and a custom toolbar
  passed through the `Toolbar` slot (level 2).
- **Collaboration**: two editors in one room, with cursors, presence and an
  offline switch. Needs the collaboration server, which `pnpm dev` starts on
  port 1234. Add `?room=name` to the URL for a document of your own, and set
  `VITE_COLLAB_URL` to use a different server.

```sh
pnpm install
pnpm dev        # from the repo root; builds the packages, then serves on http://localhost:5173
```
