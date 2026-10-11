# 5. Collaboration: Yjs, Hocuspocus 3, and a small server of our own shape

Date: 2026-10-10
Status: accepted

## Context

M2 adds real-time collaboration, self-hosted, with no dependency on any paid
service. The repository targets Node 20.19+.

## Decision

- **Open-source building blocks only.** Yjs for the shared document,
  `@tiptap/extension-collaboration` and `-collaboration-caret` (both MIT) to
  bind it to the editor, Hocuspocus (MIT) as provider and server, and
  `y-indexeddb` for the offline copy. Cursor rendering, presence state and the
  presence UI are our own.
- **Hocuspocus 3.4, not 4.** Version 4 of the server requires Node 22. The
  same goes for `better-sqlite3` 13, so the server uses 12.x. Revisit when the
  repository's minimum Node version moves.
- **Options live on the editor.** `createEditor({ features: ["collab"],
collab: { url, room, user } })`, as in the project brief. The extension adds
  the `collab` key to `EditorOptions` by declaration merging.
- **Core knows one thing about collaboration:** when the `collab` feature is
  enabled, `basics` leaves out the normal undo history (the two conflict) and
  the editor does not apply `content` directly. The extension seeds an empty
  room with it after the first sync instead.
- **The server is a thin wrapper** (`createCollabServer`) that exposes two
  extension points in our own terms: `PersistenceAdapter` (`load` / `store`)
  and `authenticate`. SQLite is the default store, PostgreSQL is optional, and
  an in-memory store exists for tests.
- **Presence data is untrusted.** Names and colours come from other clients,
  so they are validated before reaching the DOM or a `style` attribute.
- **End-to-end tests live in `e2e/`** and run with `pnpm e2e`, separate from
  the unit tests, because the acceptance criterion (two windows, a
  disconnect) can only be checked in a browser.

## Trade-offs

- Seeding from `content` can run twice if two clients open a brand-new room
  at the same moment. Creating documents on the server avoids it.
- The server has no authentication unless configured. The shipped
  `COLLAB_TOKEN` option is a single shared secret; real access control means
  writing an `authenticate` function.
- One server process only; no Redis fan-out.
- Version history (snapshots, preview, restore) from section 6.4 is not in
  this milestone.
- `better-sqlite3` is a native module. It installs a prebuilt binary where one
  exists and compiles otherwise, which needs build tools on that machine.
