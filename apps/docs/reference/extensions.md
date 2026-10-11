# @openedit/extensions

Each feature has its own entry point. Importing it registers the feature's
name. Importing `@openedit/extensions` itself registers all of them, and
brings all of them into your bundle.

| Entry point     | Feature names         | Factory                                       |
| --------------- | --------------------- | --------------------------------------------- |
| `/tables`       | `tables`              | `tables({ resizable })`                       |
| `/images`       | `images`              | `images({ upload, maxFileSize, onError })`    |
| `/slash-menu`   | `slash-menu`          | `slashMenu({ items })`                        |
| `/comments`     | `comments`            | `comments({ user, adapter, onError })`        |
| `/suggestions`  | `suggestions`         | `suggestions({ user, enabled })`              |
| `/blocks`       | `callouts`, `columns` | `callouts()`, `columns()`                     |
| `/toggles`      | `toggles`             | `toggles()`                                   |
| `/block-handle` | `block-handle`        | `blockHandle()`                               |
| `/mentions`     | `mentions`            | `mentions({ items })`                         |
| `/math`         | `math`                | `math()`                                      |
| `/collab`       | `collab`              | `collab({ url, room, user, token, offline })` |

Use the name for the defaults, or the factory to pass options:

```ts
import { images } from "@openedit/extensions/images";

features: ["basics", images({ upload })];
```

Options for `collab`, `comments`, `suggestions`, `mentions` and `ai` can also
be given on the editor, as the `collab` prop and so on, when the feature is
enabled by name.

## Headless handles

Each interactive feature exposes a handle with a `store` (`getState()`,
`subscribe()`) and methods. `null` when the feature is off.

| Getter                   | Store state                                           | Methods                                                                                       |
| ------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `getSlashMenu(editor)`   | `open, query, items, selectedIndex, getRect`          | `select`, `setSelectedIndex`                                                                  |
| `getMentions(editor)`    | `open, query, items, selectedIndex, loading, getRect` | `select`, `setSelectedIndex`                                                                  |
| `getComments(editor)`    | `threads, activeThreadId, drafting`                   | `addThread`, `reply`, `resolve`, `reopen`, `remove`, `setActive`, `setDrafting`, `canComment` |
| `getSuggestions(editor)` | `enabled, suggestions`                                | `setEnabled`, `accept`, `reject`, `acceptAll`, `rejectAll`                                    |
| `getCollab(editor)`      | `status, synced, peers`                               | `connect`, `disconnect`, plus `document` and `awareness`                                      |
| `getBlockHandle(editor)` | `pos, type`                                           | `insertBelow`, `remove`, `duplicate`, `move`, `select`, `startDrag`, `endDrag`, `getRect`     |
| `getMath(editor)`        | `editing`                                             | `insert`, `update`, `close`, `getRect`                                                        |

## Other exports

| Export                                          | From          | Meaning                              |
| ----------------------------------------------- | ------------- | ------------------------------------ |
| `insertImageFiles(editor, files, position?)`    | `/images`     | Upload and insert files              |
| `pickImageFiles(editor)`                        | `/images`     | Open the file picker first           |
| `defaultSlashMenuItems`, `filterSlashMenuItems` | `/slash-menu` | The built-in items; the search       |
| `memoryCommentsAdapter`, `restCommentsAdapter`  | `/comments`   | Comment storage                      |
| `yjsCommentsAdapter(doc)`                       | `/collab`     | Comment storage in a shared document |
| `collabColors`, `collabColorFor(seed)`          | `/collab`     | Cursor colours                       |

A slash menu item can be contributed by any extension: expose a `slashItems`
array in its storage.
