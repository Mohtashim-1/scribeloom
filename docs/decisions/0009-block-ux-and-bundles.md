# 9. Block tools, the CLI, and keeping optional features out of the bundle

Date: 2026-10-12
Status: accepted

## Decision

- **The block handle is our own.** A plugin tracks the top-level block under
  the pointer; dragging uses the engine's own drop handling by telling it
  which content is moving. Block moves also have keyboard shortcuts.
- **Toggles, math and mentions use TipTap's MIT extensions** for the document
  nodes, with our own state, menus and styles on top. Callouts and columns
  are our own nodes.
- **`@openedit/ui` reads feature state without importing the features.** Its
  hooks look a feature's handle up on the editor and import only the types.
  The default feature set is registered through per-feature imports.
  Collaboration and math are left for the app to import. This took the
  default UI from 333 KB to 208 KB gzipped.
- **The CLI ships the UI package's real source** (copied at build time) and
  copies a component together with everything it imports, preserving layout
  so relative imports keep working.
- **The browser tests run against a production build.** The dev server
  reloads pages while it optimises dependencies, which made keyboard tests
  flaky.

## Trade-offs

- A block cannot be dropped directly onto a toggle; drop it beside one.
- Emoji and footnotes from the feature list are not implemented.
- Components copied by the CLI need Tailwind (or the stock stylesheet) for
  their classes.
- The accessibility pass was automated tests plus keyboard testing by hand,
  without assistive-technology users.
