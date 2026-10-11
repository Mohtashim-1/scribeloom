# OpenEdit with Next.js

The editor in a Next.js App Router page.

```sh
pnpm install && pnpm build      # once, from the repository root
pnpm --filter example-nextjs dev
```

- `app/page.tsx` is a server component. It loads the document and passes it
  down.
- `app/document-editor.tsx` is a client component (`"use client"`) holding
  the editor.
- `app/layout.tsx` imports `@openedit/ui/styles.css` once.

The editor renders an empty frame on the server and fills in on the client.
