# 2. Features are enabled by name through a registry

Date: 2026-10-10
Status: accepted

## Context

The config API uses names (`features: ["basics", "tables", "collab"]`), but
importing the base editor must not pull in collaboration, AI or export code.
A static name-to-implementation map inside `@openedit/core` would bundle
everything.

## Decision

- `features` accepts registered names or `OpenEditExtension` objects.
- `@openedit/core` registers only `basics`. Other packages call
  `registerFeature(name, factory)` when imported and add their name to the
  `FeatureRegistry` interface through declaration merging, so the name is
  type-checked only once the package is imported.
- An unknown name throws with a message pointing at the missing import.
- Duplicate names are de-duplicated; the first occurrence wins.

## Trade-offs

- Feature packages have an import side effect (the registration), so they
  cannot be marked fully side-effect free. Users who want no side effects can
  pass the extension object instead of the name.
- In M0 `basics` is TipTap's StarterKit plus a placeholder. The rest of
  section 6.1 (highlight, color, alignment, task lists, syntax highlighting,
  character count, typography) is added alongside its toolbar UI in M1.
