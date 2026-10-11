# @openedit/themes

Design tokens and document styles for OpenEdit, as plain CSS. No JavaScript.

```ts
import "@openedit/themes/styles.css"; // tokens + document styles
```

If you use `@openedit/ui`, import `@openedit/ui/styles.css` instead: it already
includes this file.

## Restyling (customization level 1)

Every colour, radius, font and width is a CSS variable on `.oe-root`. Override
the ones you want:

```css
.oe-root {
  --oe-accent: #0d9488;
  --oe-radius: 4px;
  --oe-font: "Inter", sans-serif;
  --oe-content-width: 760px;
}

.oe-root[data-oe-theme="dark"] {
  --oe-accent: #5eead4;
}
```

The full list is in [`src/tokens.css`](./src/tokens.css). Dark mode is the same
set of variables under `.oe-root[data-oe-theme="dark"]`; the `<Editor>` `theme`
prop sets that attribute.

## Files

| Import                         | Contents                                       |
| ------------------------------ | ---------------------------------------------- |
| `@openedit/themes/styles.css`  | Everything below                               |
| `@openedit/themes/tokens.css`  | The variables, light and dark                  |
| `@openedit/themes/content.css` | Styles for the document (headings, tables, ...) |

## License

MIT
