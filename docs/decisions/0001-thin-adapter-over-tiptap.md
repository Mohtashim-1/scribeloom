# 1. Thin adapter over TipTap, mounted without `@tiptap/react`

Date: 2026-10-10
Status: accepted

## Context

App code must go through our own `createEditor()` and `defineExtension()` so
the engine can be swapped later. The React package also needs a way to put an
editor on the page.

## Decision

- `createEditor()` returns an `OpenEditor` that wraps the TipTap editor.
  Content, lifecycle and events are our own surface. `commands`, `chain()` and
  `can()` are passed through with TipTap's types, and `editor.engine` exposes
  the raw TipTap editor as an explicit escape hatch.
- `OpenEditExtension` is opaque. Only `defineExtension({ engine })` touches
  TipTap extension objects.
- `@openedit/react` mounts with the engine's own `mount()` / `unmount()`
  (TipTap v3) and does not depend on `@tiptap/react`.
- `OpenEditor` tracks `isDestroyed` itself, because TipTap reports an editor
  that was never mounted as destroyed.

## Trade-offs

- The command API is TipTap-shaped. Swapping the engine would keep the editor
  surface but break command names. A first-party command layer was judged too
  much for M0.
- Without `@tiptap/react` there are no React node views yet. When a feature
  needs one (image captions, mentions), either add `@tiptap/react` behind the
  adapter or write a small portal-based renderer. Decide in that milestone.
- A detached editor has no plugins until it is mounted, so undo history,
  keymaps and input rules start on mount. This is engine behaviour and is
  documented on `EditorOptions.element`.
