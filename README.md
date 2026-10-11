# OpenEdit

A rich text editor where everything is free: real-time collaboration,
comments, suggestions, AI, Word and PDF export, and a polished default UI.
Open source, MIT licensed, fully self-hostable. No paid tier and no feature
gating.

Built on the MIT-licensed [TipTap](https://github.com/ueberdosis/tiptap) core
and ProseMirror, with every "pro-style" feature written from scratch on open
libraries.

> **Status: pre-release.** The packages are not on npm yet. "OpenEdit" is a
> working title.

## Quick start

```tsx
import { RichTextEditor } from "@openedit/ui";
import "@openedit/ui/styles.css";

<RichTextEditor
  content="<p>Hello</p>"
  onUpdate={(editor) => save(editor.getJSON())}
/>;
```

That one component gives you a toolbar, a floating selection menu, a `/`
command menu, tables, images, comments, suggestions, callouts, columns,
toggles, a block handle, and light and dark themes.

## Features

| | |
| --- | --- |
| **Editing** | Formatting, headings, lists and task lists, links, quotes, code blocks, Markdown shortcuts |
| **Rich content** | Tables, images, callouts, columns, toggles, `@` mentions, LaTeX math |
| **Collaboration** | Live cursors, presence, offline editing, through a server you run |
| **Review** | Comment threads anchored to text; suggesting mode with accept and reject |
| **Import and export** | Markdown, HTML and Word both ways, plus PDF |
| **AI** | Any OpenAI-compatible endpoint, including a local Ollama with no key |
| **Customization** | CSS variable themes, replaceable components, or copy the source with a CLI |

## Try it

Requires Node 20.19 or newer and pnpm 10.

```sh
pnpm install
pnpm dev
```

This builds the packages, then starts the playground (the terminal prints its
address, normally http://localhost:5173), the collaboration server on port
1234 and the documentation site.

The AI demo expects an OpenAI-compatible server at `http://localhost:11434/v1`
(a local [Ollama](https://ollama.com), for example). Without one, everything
else works and AI actions report that the endpoint cannot be reached.

## Packages

| Package | What it is |
| ------- | ---------- |
| [`@openedit/core`](packages/core) | The framework-agnostic editor: `createEditor()`, `defineExtension()` |
| [`@openedit/react`](packages/react) | React bindings: `<Editor>`, `useEditor`, `useEditorState` |
| [`@openedit/ui`](packages/ui) | The default UI, and the parts to build your own |
| [`@openedit/extensions`](packages/extensions) | Tables, images, slash menu, collaboration, comments, suggestions, mentions, math, blocks |
| [`@openedit/themes`](packages/themes) | Design tokens and document styles, as plain CSS |
| [`@openedit/export`](packages/export) | Markdown, HTML, Word and PDF export |
| [`@openedit/import`](packages/import) | Markdown, HTML and Word import; paste cleanup |
| [`@openedit/ai`](packages/ai) | Provider-agnostic AI assistance |
| [`openedit`](packages/cli) | CLI that copies UI components into your project |

Apps: [`playground`](apps/playground), [`collab-server`](apps/collab-server)
and [`docs`](apps/docs). Examples for Vite, Next.js and no framework are in
[`examples`](examples).

## Documentation

The docs site is in [`apps/docs`](apps/docs): `pnpm --filter @openedit/docs dev`.
Start with [Getting started](apps/docs/guide/getting-started.md) and
[Customization](apps/docs/guide/customization.md).

## Development

```sh
pnpm build        # all packages and apps
pnpm test         # unit tests
pnpm e2e          # browser tests (uses the Chrome on your machine)
pnpm typecheck
pnpm lint
pnpm format
pnpm size         # gzipped bundle sizes against the 150 KB budget
```

Design decisions are recorded in [`docs/decisions`](docs/decisions), and the
original project brief is in [`docs/spec.md`](docs/spec.md).

## Self-hosting collaboration

```sh
docker compose up
```

starts the collaboration server on `ws://localhost:1234`, storing documents
in a volume. **It has no authentication until you configure it**: read
[Collaboration and self-hosting](apps/docs/guide/collaboration.md) before
exposing it.

## Licensing

MIT. See [LICENSE](LICENSE).

Every dependency is permissively licensed (MIT, ISC, Apache-2.0 or BSD) and
listed in [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md). This project
depends only on open-source TipTap packages, pinned to an exact version, and
on no paid or proprietary package or service. It is not affiliated with or
endorsed by Tiptap GmbH.
