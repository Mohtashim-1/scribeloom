# Accessibility

## Keyboard

| Keys                                                                                      | Action                                                             |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| <kbd>Alt</kbd> + <kbd>F10</kbd>                                                           | Move focus from the document to the selection menu, or the toolbar |
| <kbd>←</kbd> <kbd>→</kbd>                                                                 | Move between buttons in a toolbar or menu bar                      |
| <kbd>Esc</kbd>                                                                            | Return to the document; close a menu; discard an AI result         |
| <kbd>/</kbd> then <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd>                              | Open the command menu and pick                                     |
| <kbd>@</kbd> then <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd>                              | Mention someone                                                    |
| <kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd>                      | Move the current block up or down                                  |
| <kbd>Ctrl/Cmd</kbd> + <kbd>B</kbd> / <kbd>I</kbd> / <kbd>U</kbd>                          | Bold, italic, underline                                            |
| <kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> / <kbd>H</kbd>                      | Strikethrough, highlight                                           |
| <kbd>Ctrl/Cmd</kbd> + <kbd>E</kbd>                                                        | Inline code                                                        |
| <kbd>Ctrl/Cmd</kbd> + <kbd>Alt</kbd> + <kbd>1</kbd>–<kbd>3</kbd>                          | Headings                                                           |
| <kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>7</kbd> / <kbd>8</kbd> / <kbd>9</kbd>       | Numbered, bullet, task list                                        |
| <kbd>Ctrl/Cmd</kbd> + <kbd>Z</kbd>, <kbd>Ctrl/Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Undo, redo                                                         |
| <kbd>Tab</kbd> in a table                                                                 | Next cell                                                          |

Each toolbar is a single tab stop. Tooltips show a button's shortcut.

## What is in place

- The document is a named, multi-line text box (`role="textbox"`,
  `aria-multiline`, `aria-label`). Set the name with the `label` option.
- Every button has an accessible name; toggles report their pressed state;
  unavailable buttons are disabled.
- Toolbars use the toolbar pattern, dropdowns the menu pattern.
- The slash and mention menus are list boxes. Focus stays in the document
  while you arrow through them, and the document announces the active option
  through `aria-activedescendant`.
- Floating menus stay open while focus is inside them.
- AI results, connection state and errors are announced through live regions.
- Other people's cursor labels are hidden from the accessibility tree, so
  they are not read out as part of the text.
- Body text, links and icons meet WCAG AA contrast in both themes.
- Focus is always visible. Animation is limited to a spinner, which stops
  when the system asks for reduced motion.

## Known gaps

- This was checked with automated tests and by hand with a keyboard, not with
  screen reader users. Treat it as a good starting point, not a conformance
  claim.
- The block handle needs a pointer. Its "move" actions have keyboard
  shortcuts; "turn into", "duplicate" and "delete" are reachable through the
  toolbar, the slash menu and normal editing.
- Resizing an image or a table column needs a pointer.
- Placeholder text (`--oe-faint`) is below AA contrast by design, as
  placeholders usually are. Raise it if you rely on the placeholder to convey
  instructions.
- If you replace components or tokens, their accessibility is yours to check.
