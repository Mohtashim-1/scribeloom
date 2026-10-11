# Third-party licenses

Every dependency of this repository and its license. Update this file in the
same change that adds, removes or upgrades a dependency. To regenerate the raw
data, run `pnpm licenses list --prod` and `pnpm licenses list --dev`.

Allowed licenses for anything we ship: MIT, Apache-2.0, ISC, BSD (including 0BSD).

## Runtime dependencies (shipped to users)

All TipTap packages are pinned to an exact version (currently `3.31.4`). If
their license ever changes, we stay on the last MIT release.

| Package                                 | Used by                       | License |
| --------------------------------------- | ----------------------------- | ------- |
| `@tiptap/core`                          | `core`, `extensions`          | MIT     |
| `@tiptap/pm`                            | `core`, `extensions`          | MIT     |
| `@tiptap/starter-kit`                   | `core`                        | MIT     |
| `@tiptap/extensions`                    | `core`                        | MIT     |
| `@tiptap/extension-highlight`           | `core`                        | MIT     |
| `@tiptap/extension-text-align`          | `core`                        | MIT     |
| `@tiptap/extension-list`                | `core`                        | MIT     |
| `@tiptap/extension-table`               | `extensions`                  | MIT     |
| `@tiptap/extension-image`               | `extensions`                  | MIT     |
| `@tiptap/suggestion`                    | `extensions`                  | MIT     |
| `@tiptap/extension-collaboration`       | `extensions`                  | MIT     |
| `@tiptap/extension-collaboration-caret` | `extensions`                  | MIT     |
| `@tiptap/y-tiptap`                      | `extensions`                  | MIT     |
| `yjs`                                   | `extensions`, `collab-server` | MIT     |
| `y-protocols`                           | `extensions`                  | MIT     |
| `y-indexeddb`                           | `extensions`                  | MIT     |
| `@hocuspocus/provider`                  | `extensions`                  | MIT     |
| `@hocuspocus/server`                    | `collab-server`               | MIT     |
| `@hocuspocus/extension-database`        | `collab-server`               | MIT     |
| `better-sqlite3`                        | `collab-server`               | MIT     |
| `pg` (optional)                         | `collab-server`               | MIT     |
| `radix-ui`                              | `ui`                          | MIT     |
| `@floating-ui/react-dom`                | `ui`                          | MIT     |
| `lucide-react`                          | `ui`                          | ISC     |

"Used by" names the `@openedit/*` package (`collab-server` is the app in
`apps/`). `react` and `react-dom` (MIT) are
peer dependencies of `@openedit/react` and `@openedit/ui`.

### Transitive runtime dependencies

All MIT unless noted:

- Pulled in by `@tiptap/starter-kit`: `@tiptap/extension-blockquote`,
  `-bold`, `-bullet-list`, `-code`, `-code-block`, `-document`, `-dropcursor`,
  `-gapcursor`, `-hard-break`, `-heading`, `-horizontal-rule`, `-italic`,
  `-link`, `-list`, `-list-item`, `-list-keymap`, `-ordered-list`,
  `-paragraph`, `-strike`, `-text`, `-underline`
- ProseMirror, via `@tiptap/pm`: `prosemirror-changeset`, `-commands`,
  `-dropcursor`, `-gapcursor`, `-history`, `-inputrules`, `-keymap`, `-model`,
  `-schema-list`, `-state`, `-tables`, `-transform`, `-view`
- `linkifyjs`, `orderedmap`, `rope-sequence`, `w3c-keyname`
- `scheduler` (via `react-dom`)
- Via `radix-ui`: the `@radix-ui/*` packages (`react-toolbar`,
  `react-tooltip`, `react-dropdown-menu`, `react-popover` and their shared
  internals), `aria-hidden`, `detect-node-es`, `get-nonce`,
  `react-remove-scroll`, `react-remove-scroll-bar`, `react-style-singleton`,
  `use-callback-ref`, `use-sidecar`, and `tslib` (0BSD)
- Via `@floating-ui/react-dom`: `@floating-ui/core`, `@floating-ui/dom`,
  `@floating-ui/utils`

- Via Yjs and Hocuspocus: `lib0`, `isomorphic.js`, `@hocuspocus/common`,
  `@lifeomic/attempt`, `async-lock`, `async-mutex`, `kleur`, `ws`
- Server only, via `better-sqlite3` (native module install tooling):
  `bindings`, `file-uri-to-path`, `prebuild-install` and its helpers (`bl`,
  `buffer`, `base64-js`, `decompress-response`, `deep-extend`,
  `end-of-stream`, `fs-constants`, `github-from-package`, `mimic-response`,
  `minimist`, `mkdirp-classic`, `napi-build-utils`, `node-abi`, `pump`,
  `readable-stream`, `safe-buffer`, `simple-concat`, `simple-get`,
  `string_decoder`, `strip-json-comments`, `tar-fs`, `tar-stream`,
  `util-deprecate`), plus `chownr`, `inherits`, `ini`, `once`, `semver`,
  `wrappy` (ISC), `detect-libc`, `tunnel-agent` (Apache-2.0), `ieee754`
  (BSD-3-Clause), `expand-template` (MIT OR WTFPL), `rc` (BSD-2-Clause OR MIT
  OR Apache-2.0)
- Server only, via `pg`: `pg-pool`, `pg-protocol`, `pg-types`,
  `pg-connection-string`, `pg-cloudflare`, `pgpass`, `postgres-array`,
  `postgres-bytea`, `postgres-date`, `postgres-interval`, `xtend`, and
  `pg-int8`, `split2` (ISC)

The collaboration packages are the open-source ones. Nothing here depends on
TipTap's hosted collaboration service or any paid package; the server is
Hocuspocus (MIT), self-hosted.

Icons come from `lucide-react` only (ISC).

### TipTap notice

```
MIT License

Copyright (c) 2025, Tiptap GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Development dependencies (not shipped)

| Package                            | License    |
| ---------------------------------- | ---------- |
| `@changesets/cli`                  | MIT        |
| `@eslint/js`, `eslint`             | MIT        |
| `eslint-plugin-react-hooks`        | MIT        |
| `globals`                          | MIT        |
| `typescript-eslint`                | MIT        |
| `prettier`                         | MIT        |
| `turbo`                            | MIT        |
| `typescript`                       | Apache-2.0 |
| `tsup`                             | MIT        |
| `vite`, `@vitejs/plugin-react`     | MIT        |
| `vitest`                           | MIT        |
| `jsdom`                            | MIT        |
| `@testing-library/react`           | MIT        |
| `@types/react`, `@types/react-dom` | MIT        |

Transitive development dependencies are MIT, ISC, Apache-2.0 or BSD, except
the following, which are build and test tooling only and never part of a
published package:

| Package                                                               | License       |
| --------------------------------------------------------------------- | ------------- |
| `lightningcss` (via `vite`)                                           | MPL-2.0       |
| `caniuse-lite`                                                        | CC-BY-4.0     |
| `mdn-data`                                                            | CC0-1.0       |
| `lru-cache`, `minimatch`                                              | BlueOak-1.0.0 |
| `@csstools/color-helpers`, `@csstools/css-syntax-patches-for-csstree` | MIT-0         |
