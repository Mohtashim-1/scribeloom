# OpenEdit (working title)

> A fully open-source, batteries-included rich text editor built on the TipTap core engine.
> Everything is free: collaboration, comments, AI, export, a polished default UI. No paid tier, no feature gating, ever.

**Working title only.** Do NOT use "Tiptap" in the package name, npm scope, or branding (trademark). Rename freely before first publish.

---

## 1. Vision

TipTap's core is MIT-licensed, but its most useful features (collaboration cloud, comments, AI, DOCX export, polished UI templates) sit behind a paid plan. This project fills that gap:

- **Engine:** TipTap core + free MIT extensions (which sit on ProseMirror)
- **Our layer:** open-source implementations of the "Pro-style" features
- **Default UI:** a modern, Notion-like UI that works out of the box
- **Replaceable UI:** developers can theme it, swap individual components, or copy the component code into their own project (shadcn-style)

Goals: simple to adopt, feature-rich, easy to extend, fully self-hostable, MIT licensed.

---

## 2. Legal and licensing rules (IMPORTANT, follow strictly)

1. License of this repo: **MIT**.
2. We may depend on `@tiptap/core`, `@tiptap/pm`, `@tiptap/react` and the free MIT `@tiptap/extension-*` packages.
3. We must **never** depend on, copy, or reimplement by reading the code of any TipTap Pro / paid package or template (collaboration cloud, comments, AI, DOCX export, drag handle, Notion-like template, etc.). Build these from scratch using open libraries (Yjs, Hocuspocus, mammoth, docx, etc.) and our own design.
4. Do not copy TipTap Pro UI code, icons, CSS, or assets. UX patterns (floating toolbar, `/` slash menu, drag handle) are fine to build in our own way with new code.
5. Icons: use `lucide-react` (ISC/MIT) only.
6. Keep a `THIRD_PARTY_LICENSES.md` listing every dependency and its license. Add the MIT notice for TipTap core.
7. Pin TipTap versions. If their license ever changes, we stay on the last MIT version.

---

## 3. Tech stack

- **Language:** TypeScript (strict)
- **Monorepo:** pnpm workspaces + Turborepo
- **Editor engine:** TipTap core (ProseMirror underneath)
- **Framework (v1):** React 18+. Vue adapter is a later milestone, so keep core logic framework-agnostic.
- **Collaboration:** Yjs + Hocuspocus (self-hosted, Node)
- **UI:** Tailwind CSS + Radix UI primitives + lucide-react, with CSS variable theming
- **Build:** tsup (libraries), Vite (playground and docs)
- **Testing:** Vitest (unit), Playwright (e2e)
- **Docs:** Astro Starlight or VitePress
- **Release:** Changesets

---

## 4. Monorepo layout

```
openedit/
├─ apps/
│  ├─ playground/        # Vite demo app, every feature togglable
│  ├─ docs/              # documentation site
│  └─ collab-server/     # reference Hocuspocus server (Docker-ready)
├─ packages/
│  ├─ core/              # createEditor(), config, adapter over TipTap
│  ├─ extensions/        # our open extensions (see section 6)
│  ├─ react/             # <Editor/>, hooks, bindings
│  ├─ ui/                # default UI components (headless logic + styled)
│  ├─ themes/            # CSS variable tokens, light/dark presets
│  ├─ export/            # docx, pdf, markdown, html export
│  ├─ import/            # docx, markdown import
│  ├─ ai/                # provider-agnostic AI extension + adapters
│  └─ cli/               # `npx openedit add <component>` copies UI code
├─ THIRD_PARTY_LICENSES.md
├─ LICENSE (MIT)
└─ README.md
```

---

## 5. Architecture principles

1. **Thin adapter over TipTap.** All app code goes through our own `createEditor()` and `defineExtension()` so the engine can be swapped later without breaking users.
2. **Headless first.** Every feature (bubble menu, slash menu, toolbar, comments sidebar) has:
   - logic layer: commands, state, hooks (no styling)
   - UI layer: default styled component built on the logic layer
3. **Three levels of UI customization:**
   - **Level 1 (theme):** change CSS variables / tokens
   - **Level 2 (slots):** replace individual components via props, e.g. `<Editor ui={{ Toolbar: MyToolbar }} />`
   - **Level 3 (ownership):** `npx openedit add toolbar` copies the component source into the user's project to edit freely
4. **Config-driven:**
   ```ts
   const editor = createEditor({
     features: ["basics", "tables", "images", "slash-menu", "comments", "ai", "collab"],
     ui: DefaultUI,
     collab: { url: "ws://localhost:1234", room: "doc-1", user: { name, color } },
     ai: { provider: openaiCompatible({ baseUrl, apiKey, model }) },
   });
   ```
5. **Everything optional and tree-shakeable.** Importing the base editor must not pull in collab, AI, or export code.
6. **Accessibility:** keyboard navigation, ARIA roles, focus management on all menus and dialogs.
7. **No telemetry, no cloud dependency, no API keys required** except for the user's own AI provider.

---

## 6. Features to build

### 6.1 Basics (use free TipTap extensions where MIT)
Paragraph, headings, bold, italic, underline, strike, code, highlight, text color, text align, links, blockquote, horizontal rule, bullet / ordered / task lists, code blocks with syntax highlighting (lowlight), placeholder, character count, typography, undo / redo, history.

### 6.2 Rich content
Tables (resize, merge, header row), images (upload hook, paste, drag-drop, resize, caption), embeds (YouTube, generic iframe), math (KaTeX), mentions, emoji, callouts / admonitions, toggle blocks, columns layout.

### 6.3 UI (our open version of the "Notion-like" experience)
- Fixed toolbar and floating bubble menu
- `/` slash menu with search and keyboard navigation
- Block drag handle with a "+" insert button and block actions menu
- Link popover, image popover, table controls
- Light / dark themes, mobile-friendly behavior
- Command palette (optional)

### 6.4 Collaboration (`extensions/collab` + `apps/collab-server`)
- Yjs document sync via Hocuspocus
- Presence: live cursors and selections with user names and colors
- Awareness list (who is online)
- Offline support with IndexedDB persistence (`y-indexeddb`)
- Server: auth hook, persistence adapter interface (SQLite default, Postgres optional), Dockerfile
- Version history: periodic Yjs snapshots, list, preview, restore

### 6.5 Comments and suggestions (`extensions/comments`)
- Comment mark anchored to a text range (survives edits and collab)
- Threads with replies, resolve / reopen
- Pluggable storage adapter (default: in the Yjs doc; optional REST adapter)
- Suggestion mode (track changes style: insert / delete marks with accept / reject)

### 6.6 AI (`packages/ai`)
- Provider-agnostic interface; adapters for OpenAI-compatible APIs (works with Ollama, LM Studio, vLLM, OpenAI, etc.)
- Actions: continue writing, improve, shorten, expand, fix grammar, translate, summarize, custom prompt
- Streaming output into the document, with accept / discard preview
- AI slash commands and bubble menu actions
- User supplies their own endpoint and key; nothing is sent anywhere by default

### 6.7 Import / export (`packages/export`, `packages/import`)
- Export: Markdown, HTML, JSON, DOCX (`docx` lib), PDF (server-side Puppeteer helper and a client print-to-PDF option)
- Import: DOCX (`mammoth`), Markdown, HTML
- Paste cleanup for content from Word / Google Docs

### 6.8 Extras (later)
Find and replace, table of contents, footnotes, page breaks and print layout, spellcheck integration, RTL support, i18n for UI strings.

---

## 7. Milestones (build in this order)

Each milestone must end with: passing tests, a working playground demo, and updated docs.

**M0, Scaffold**
- pnpm + Turborepo monorepo, TS config, ESLint, Prettier, Vitest, Changesets
- `core` with `createEditor()` and `defineExtension()` adapter over TipTap
- `react` with `<Editor/>` and `useEditor`
- Playground renders a basic editor

**M1, Default UI**
- Toolbar, bubble menu, slash menu, link popover
- Tables and images with controls
- Theme tokens (light/dark), Level 1 and Level 2 customization working
- Acceptance: a developer can restyle via CSS variables and replace the toolbar via a slot in under 10 lines of code

**M2, Collaboration**
- Yjs + Hocuspocus integration, live cursors, presence list
- Reference server with Docker
- IndexedDB offline persistence
- Acceptance: two browser windows edit the same doc in real time, including after a temporary disconnect

**M3, Comments and suggestions**
- Comment marks, threads, sidebar UI, resolve flow
- Suggestion mode with accept / reject
- Acceptance: comments stay anchored correctly while another user edits around them

**M4, Export and import**
- Markdown, HTML, DOCX, PDF export; DOCX and Markdown import
- Acceptance: round-trip a sample document with headings, lists, tables, and images without data loss

**M5, AI**
- Provider interface, OpenAI-compatible adapter, streaming, AI menu
- Acceptance: works against a local Ollama endpoint with zero cloud keys

**M6, Block UX and polish**
- Drag handle, block actions, callouts, toggles, columns, math, mentions
- Level 3 CLI (`add` command copies component source)
- Accessibility audit, performance pass (large docs), mobile polish

**M7, Docs and release**
- Docs site with getting started, API reference, customization guide (all 3 levels), self-hosting guide
- Examples: Next.js, Vite, plain HTML
- First public release under MIT

---

## 8. Coding standards for Claude Code

- TypeScript strict mode, no `any` without a comment explaining why
- Small focused modules; every public API documented with TSDoc
- Write tests alongside features (unit for commands and extensions, Playwright for UI and collab)
- Conventional commits; one logical change per commit
- Every new package gets: `package.json` with `exports`, README, tests, and a playground example
- Never add a dependency without checking its license is MIT / Apache-2.0 / ISC / BSD, and record it in `THIRD_PARTY_LICENSES.md`
- Prefer boring, well-maintained libraries over clever ones
- If a decision is ambiguous, pick the simpler option and note the trade-off in `docs/decisions/` (ADR format)

---

## 9. Definition of done (v1.0)

- [ ] All features in sections 6.1 to 6.7 working in the playground
- [ ] Three-level UI customization documented with working examples
- [ ] Collab server runs from `docker compose up`
- [ ] Zero dependencies on any paid / proprietary package
- [ ] Bundle size budget: base editor under 150 KB gzipped (without optional features)
- [ ] 80%+ test coverage on core and extensions
- [ ] Docs site live, MIT license and third-party licenses in place

---

## 10. First task for Claude Code

1. Read this whole README.
2. Complete **M0**: scaffold the monorepo, implement `core` and `react` packages, and get a basic editor running in `apps/playground`.
3. Show me the folder tree and how to run it, then wait for my review before starting M1.

Ask questions only if something blocks progress; otherwise make a reasonable choice and document it.