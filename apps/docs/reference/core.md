# @openedit/core

The framework-agnostic editor. A thin layer over the TipTap engine, so your
code depends on this API and not on the engine.

## createEditor(options)

Returns an `OpenEditor`.

| Option        | Type                          | Default              | Meaning                                    |
| ------------- | ----------------------------- | -------------------- | ------------------------------------------ |
| `features`    | `Array<name \| extension>`    | `["basics"]`         | What the editor can do                     |
| `content`     | `string \| JSON`              | empty                | Initial content: HTML or a JSON document   |
| `editable`    | `boolean`                     | `true`               | Whether the document can be edited         |
| `placeholder` | `string`                      | none                 | Shown while the document is empty          |
| `label`       | `string`                      | `"Rich text editor"` | Name announced by screen readers           |
| `autofocus`   | `boolean \| "start" \| "end"` | `false`              | Focus once mounted                         |
| `element`     | `HTMLElement`                 | none                 | Mount right away. Leave out to mount later |
| `onUpdate`    | `(editor) => void`            | none                 | Called after every change                  |

Feature packages add their own options (`collab`, `comments`, `ai`, ...).

## OpenEditor

| Member                                                              | Meaning                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `mount(element)`, `unmount()`, `destroy()`                          | Lifecycle                                                           |
| `isMounted`, `isDestroyed`, `isFocused`, `isEditable`, `isEmpty`    | State                                                               |
| `getHTML()`, `getJSON()`, `getText()`                               | Read the document                                                   |
| `setContent(content, { emitUpdate })`                               | Replace the document                                                |
| `setEditable(boolean)`, `focus(position?)`                          |                                                                     |
| `commands`, `chain()`, `can()`                                      | Run commands, chain them, or check them                             |
| `isActive(name, attrs?)`, `isActive(attrs)`                         | Whether a node or mark is active at the selection                   |
| `has(name)`                                                         | Whether an extension, node or mark is enabled                       |
| `getAttributes(name)`                                               | Attributes at the selection, e.g. a link's `href`                   |
| `isSelectionEmpty`, `selectedNodeName`                              | Selection state                                                     |
| `getSelectionRect()`, `getRangeRect(from, to)`, `getNodeRect(name)` | Screen rectangles, for positioning UI                               |
| `element`                                                           | The editable DOM element                                            |
| `on(event, handler)`                                                | Subscribe. Returns an unsubscribe function                          |
| `engine`                                                            | The underlying TipTap editor. Using it ties your code to the engine |

Events: `update`, `selectionUpdate`, `transaction`, `focus`, `blur`, `mount`,
`unmount`, `destroy`.

A detached editor (no `element`) can read and replace content and run
commands, but undo history, keyboard shortcuts and input rules start on
mount.

## Commands

```ts
editor.chain().focus().toggleBold().run();
editor.can().undo();
```

`chain()` collects commands and applies them together with `.run()`.
Commands come from the enabled features: `toggleBold`, `toggleHeading`,
`setTextAlign`, `insertTable`, `setCallout`, and so on. They are typed, so
your editor's autocomplete lists them.

## defineExtension({ name, engine })

Wraps engine extensions as a feature. `engine` is called once per editor.

## registerFeature(name, factory)

Makes a feature available by name. Feature packages call it when imported.
To type-check the name, extend `FeatureRegistry`:

```ts
declare module "@openedit/core" {
  interface FeatureRegistry {
    "my-feature": true;
  }
}
```

## Other exports

| Export                             | Meaning                                          |
| ---------------------------------- | ------------------------------------------------ |
| `basics({ placeholder, history })` | The baseline feature, as an extension            |
| `hasFeature(options, name)`        | Whether options enable a feature                 |
| `getEditor(engine)`                | The `OpenEditor` that owns an engine editor      |
| `createStore(initial)`             | A small observable value, used for feature state |
