# Examples

Three small projects in the repository's `examples` folder. Each is a
workspace package, so from the repository root:

```sh
pnpm install
pnpm build
pnpm --filter <name> dev
```

| Example               | Package name         | Shows                                                            |
| --------------------- | -------------------- | ---------------------------------------------------------------- |
| `examples/vite-react` | `example-vite-react` | `RichTextEditor` in a Vite + React app, saving to `localStorage` |
| `examples/nextjs`     | `example-nextjs`     | The editor in a Next.js App Router page, as a client component   |
| `examples/vanilla`    | `example-vanilla`    | `@openedit/core` with plain DOM buttons and no framework         |

The repository's playground (`apps/playground`) is the fullest example: it
has every feature switched on, including collaboration and AI.

## Next.js

The editor needs the browser, so it lives in a client component:

```tsx
"use client";

import { RichTextEditor } from "@openedit/ui";
import "@openedit/ui/styles.css";

export function DocumentEditor() {
  return <RichTextEditor content="<p>Hello</p>" />;
}
```

It renders an empty shell on the server and fills in on the client, so there
is no hydration mismatch.
