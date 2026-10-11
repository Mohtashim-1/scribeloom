# @openedit/ui

The default interface. Import the stylesheet once:

```ts
import "@openedit/ui/styles.css";
```

## Components

| Export                               | Meaning                                                    |
| ------------------------------------ | ---------------------------------------------------------- |
| `RichTextEditor`                     | `<Editor>` with the default features and every slot filled |
| `DefaultUI`, `defaultFeatures`       | The slot set and feature list it uses                      |
| `Toolbar`                            | The fixed toolbar. Takes `children` to add buttons         |
| `BubbleMenu`                         | Floating menu on a text selection                          |
| `SlashMenu`, `MentionMenu`           | The `/` and `@` menus                                      |
| `TableMenu`, `ImageMenu`, `MathMenu` | Controls for what is in focus                              |
| `CommentsSidebar`                    | Comments and suggestions                                   |
| `BlockHandle`                        | Handle beside the hovered block                            |
| `AIMenu`, `AIPanel`                  | AI actions; the accept / discard panel                     |
| `Presence`                           | Who is in the document, and the connection state           |

`RichTextEditor` turns on `collab`, `ai` and `mentions` when you pass their
settings. Collaboration and math also need their import:
`@openedit/extensions/collab`, `@openedit/extensions/math`.

## Building blocks

| Export                                             | Meaning                                   |
| -------------------------------------------------- | ----------------------------------------- |
| `Bar`, `BarButton`, `BarSeparator`                 | A toolbar row, its buttons, a divider     |
| `actions`                                          | The built-in actions, by id               |
| `ActionButton`, `ActionMenu`                       | A button, or a dropdown, bound to actions |
| `LinkButton`, `LinkEditor`                         | Link popover and its form                 |
| `CommentButton`, `SuggestingToggle`, `ThemeToggle` | Single-purpose buttons                    |
| `panelClass`                                       | Class names for a floating panel          |

Action ids: `undo`, `redo`, `paragraph`, `heading1`–`heading3`, `bulletList`,
`orderedList`, `taskList`, `blockquote`, `codeBlock`, `horizontalRule`,
`bold`, `italic`, `underline`, `strike`, `code`, `highlight`, `alignLeft`,
`alignCenter`, `alignRight`, `alignJustify`, `image`, `table`.

## Hooks

| Hook                                                                    | Returns                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| `useActionState(editor, action)`                                        | `{ available, active, enabled }`                                |
| `useAnchoredPosition({ editor, open, getRect, placement })`             | A ref and style for a floating element                          |
| `useSlashMenu`, `useMentions`, `useMath`                                | The feature handle and its state                                |
| `useComments`, `useSuggestions`, `useCollab`, `useAI`, `useBlockHandle` | The feature handle and its state                                |
| `useEditorFocus(editor)`                                                | Whether the editor has focus, lingering briefly after it leaves |
| `useFocusWithin()`, `useIsSelecting(editor)`                            | Helpers for floating menus                                      |
| `useToolbarShortcut(editor, getContainer)`                              | Wires Alt+F10 to a toolbar                                      |
| `useActiveDescendant(editor, open, listId, activeId)`                   | Announces a list's active option                                |

Each feature hook returns `null` for the handle when that feature is off.

## Helpers

`normalizeUrl(input)` cleans up a typed URL: `example.com` becomes
`https://example.com`, an email becomes `mailto:`, and schemes other than
`http`, `https`, `mailto` and `tel` are rejected. `applyLink`, `removeLink`
and `getLinkHref` act on the selection. `formatShortcut("Mod+B")` formats a
shortcut for the platform.
