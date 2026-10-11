# openedit

Copies OpenEdit UI components into your project, so you can edit them as your
own code.

```sh
npx openedit list
npx openedit add toolbar
```

`add` copies the component and every file it imports into
`src/components/openedit` (change it with `--dir`), keeps existing files
unless you pass `--overwrite`, and lists the packages the copied files need.

Then use your copy through the `ui` prop:

```tsx
import { DefaultUI } from "@openedit/ui";
import { Toolbar } from "./components/openedit/components/toolbar";

<Editor ui={{ ...DefaultUI, Toolbar }} />;
```

The components are styled with Tailwind CSS utilities that read the OpenEdit
tokens. `npx openedit add theme` copies the stylesheet that defines them.

See the [CLI reference](../../apps/docs/reference/cli.md).

## License

MIT
