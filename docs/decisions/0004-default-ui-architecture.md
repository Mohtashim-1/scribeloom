# 4. Default UI: slots, tokens, and a precompiled stylesheet

Date: 2026-10-10
Status: accepted

## Context

M1 adds the default UI. It has to work out of the box, be restylable through
CSS variables (level 1), and let developers replace individual parts (level
2). The stack is Tailwind CSS, Radix UI and lucide-react. The visual direction
is a slim, centred icon toolbar over a narrow document column, in the manner
of TipTap's public demo editors; all code, CSS and icons here are our own.

## Decision

- **Slots live in `@openedit/react`, components in `@openedit/ui`.**
  `<Editor ui={{ Toolbar, BubbleMenu, SlashMenu, TableMenu, ImageMenu }}>`
  renders whatever it is given and is headless without it. `@openedit/ui`
  exports `DefaultUI` and `RichTextEditor`. This keeps `react` free of UI
  dependencies and avoids a circular dependency.
- **Headless logic first.** Slash-menu state, image upload and table commands
  are in `@openedit/extensions` with no UI. Toolbar logic is the `actions`
  table plus hooks (`useActionState`, `useAnchoredPosition`, ...), which the
  styled components consume and which are exported.
- **Tokens are plain CSS variables** on `.oe-root` in `@openedit/themes`, with
  dark mode as the same variables under `[data-oe-theme="dark"]`.
- **Tailwind is a build-time detail.** Components use utility classes mapped
  to the tokens. `@openedit/ui/styles.css` is compiled with only the `theme`
  and `utilities` layers, so consumers need no Tailwind setup and the host
  page is not reset. Our small reset is scoped to `.oe-root` in its own
  cascade layer.
- **Radix for toolbars, dropdowns, popovers and tooltips; Floating UI for
  menus anchored to the document** (bubble, slash, table, image). Those must
  not take focus from the editor, which Radix popovers are built to do.
- **Floating elements render inside the editor root**, not `document.body`,
  so they inherit the tokens. They use `position: fixed`.

## Trade-offs

- Utility class names in the compiled stylesheet are unprefixed. A host app
  that also uses Tailwind gets the same rules twice, which is harmless; a host
  with a conflicting class of the same name (say, its own `.flex`) would
  clash. A prefix would fix that at the cost of noisier component source.
- The stylesheet's utilities are in a cascade layer, so unlayered host CSS
  such as a global `button { ... }` rule overrides them.
- A transformed ancestor breaks `position: fixed` for the floating menus.
- Syntax highlighting, text colour, typography and character count from
  section 6.1 are not in yet, nor is image captioning. `Ctrl/Cmd + K` for
  links is not bound.
- The image menu offers replace and delete only.
