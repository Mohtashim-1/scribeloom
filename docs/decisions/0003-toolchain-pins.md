# 3. Toolchain version pins

Date: 2026-10-10
Status: accepted

## Decision

- **TypeScript `~5.9`**, not 7.x. `typescript-eslint` 8 supports TypeScript
  below 6.1 only, and `tsup`'s declaration bundler fails on 7.x. Revisit when
  both support it.
- **jsdom `^29`**, not 30. jsdom 30 requires Node 22.22+, and the repository
  supports Node 20.19+.
- **`.d.ts` banner in `@openedit/core`.** TipTap command typings
  (`toggleBold()`, `undo()`, ...) are module augmentations that live in
  `@tiptap/starter-kit`. The declaration bundler drops a type-only import of
  it, so `tsup.config.ts` adds `import "@tiptap/starter-kit"` as a banner.
  Without it, packages that depend only on `@openedit/core` do not see those
  commands.
- **Workspace packages resolve through `dist`.** Turborepo builds
  dependencies first (`dependsOn: ["^build"]`), including for `dev`, `test`
  and `typecheck`.
