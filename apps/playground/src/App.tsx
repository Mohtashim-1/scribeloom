import { openaiCompatible } from "@openedit/ai";
import { collabColors } from "@openedit/extensions/collab";
import { Editor, type EditorTheme, type EditorUIProps } from "@openedit/react";
import {
  ActionButton,
  ActionMenu,
  actions,
  Bar,
  BarButton,
  BarSeparator,
  defaultFeatures,
  LinkButton,
  Presence,
  RichTextEditor,
  ThemeToggle,
  Toolbar,
  useCollab,
  type EditorAction,
} from "@openedit/ui";
import {
  FileCode,
  FileDown,
  FileText,
  FileType,
  FileUp,
  List,
  Printer,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { collabContent, customContent, notionContent, simpleContent } from "./content";

// Any OpenAI-compatible endpoint. The default is a local Ollama, which needs no key.
const aiProvider = openaiCompatible({
  baseUrl: import.meta.env.VITE_AI_URL ?? "http://localhost:11434/v1",
  model: import.meta.env.VITE_AI_MODEL,
  apiKey: import.meta.env.VITE_AI_KEY,
});

// ?collab=ws://host:port picks the collaboration server at run time.
const COLLAB_URL: string =
  new URLSearchParams(location.search).get("collab") ??
  import.meta.env.VITE_COLLAB_URL ??
  "ws://localhost:1234";
// Share the page URL with ?room=name to edit a document of your own.
const COLLAB_ROOM = new URLSearchParams(location.search).get("room") ?? "playground";

/** Toolbar for the collaboration demo: who is here, and a switch to go offline. */
function CollabToolbar({ editor }: EditorUIProps) {
  const { collab, state } = useCollab(editor);
  const offline = state.status === "disconnected";
  return (
    <Bar aria-label="Formatting" className="demo-bar">
      <ActionButton editor={editor} action={actions.undo} />
      <ActionButton editor={editor} action={actions.redo} />
      <BarSeparator />
      <ActionButton editor={editor} action={actions.bold} />
      <ActionButton editor={editor} action={actions.italic} />
      <ActionButton editor={editor} action={actions.highlight} />
      <ActionMenu
        editor={editor}
        label="List"
        icon={List}
        actions={[actions.bulletList, actions.orderedList, actions.taskList]}
      />
      <LinkButton editor={editor} />
      <span className="demo-bar-spacer" />
      <Presence editor={editor} />
      <BarButton
        label={offline ? "Go online" : "Go offline"}
        onClick={() => (offline ? collab?.connect() : collab?.disconnect())}
      >
        {offline ? <WifiOff size={16} aria-hidden="true" /> : <Wifi size={16} aria-hidden="true" />}
      </BarButton>
    </Bar>
  );
}

/*
 * Export and import, loaded on first use so they stay out of the initial
 * bundle. Each entry is an ordinary action, so the stock ActionMenu shows it.
 */
const fileActions: EditorAction[] = [
  {
    id: "export-markdown",
    label: "Download Markdown",
    icon: FileText,
    run: async (editor) => {
      const { download, toMarkdown } = await import("@openedit/export");
      download(toMarkdown(editor), "document.md", "text/markdown");
    },
  },
  {
    id: "export-html",
    label: "Download HTML",
    icon: FileCode,
    run: async (editor) => {
      const { download, toHtmlDocument } = await import("@openedit/export");
      download(toHtmlDocument(editor, { title: "Document" }), "document.html", "text/html");
    },
  },
  {
    id: "export-docx",
    label: "Download Word (.docx)",
    icon: FileType,
    run: async (editor) => {
      const { download, toDocx, DOCX_MIME_TYPE } = await import("@openedit/export");
      download(await toDocx(editor), "document.docx", DOCX_MIME_TYPE);
    },
  },
  {
    id: "export-pdf",
    label: "Print / save as PDF",
    icon: Printer,
    run: async (editor) => {
      const { printToPdf } = await import("@openedit/export");
      await printToPdf(editor, { title: "Document" });
    },
  },
  {
    id: "import-file",
    label: "Open a file (.docx, .md, .html)",
    icon: FileUp,
    run: async (editor) => {
      const { IMPORT_ACCEPT, importFile, pickFile } = await import("@openedit/import");
      const file = await pickFile(IMPORT_ACCEPT);
      if (!file) return;
      try {
        const warnings = await importFile(editor, file);
        if (warnings.length) console.warn("Imported with warnings:", warnings);
      } catch (error) {
        alert(error instanceof Error ? error.message : String(error));
      }
    },
  },
];

/** The default toolbar, with a file menu added to it. */
function ToolbarWithFileMenu(props: EditorUIProps) {
  return (
    <Toolbar {...props}>
      <ActionMenu editor={props.editor} label="File" icon={FileDown} actions={fileActions} />
    </Toolbar>
  );
}

const collaborators = [
  { name: "Ada Lovelace", color: collabColors[5]! },
  { name: "Grace Hopper", color: collabColors[0]! },
];

/** Level 2 customization: a toolbar of our own, built from the default parts. */
function CompactToolbar({ editor }: EditorUIProps) {
  return (
    <Bar aria-label="Formatting" className="demo-bar">
      <ActionButton editor={editor} action={actions.bold} />
      <ActionButton editor={editor} action={actions.italic} />
      <ActionButton editor={editor} action={actions.highlight} />
      <LinkButton editor={editor} />
      <span className="demo-bar-spacer" />
      <ThemeToggle />
    </Bar>
  );
}

/** For the toolbar-less layout: just history and the theme toggle, out of the way. */
function QuietHeader({ editor }: EditorUIProps) {
  return (
    <Bar aria-label="Document" className="demo-bar">
      <span className="demo-bar-spacer" />
      <ActionButton editor={editor} action={actions.undo} />
      <ActionButton editor={editor} action={actions.redo} />
      <BarSeparator />
      <ThemeToggle />
    </Bar>
  );
}

const people = [
  { id: "ada", label: "Ada Lovelace", description: "Analytical Engine" },
  { id: "alan", label: "Alan Turing", description: "Computing Machinery" },
  { id: "grace", label: "Grace Hopper", description: "Compilers" },
  { id: "katherine", label: "Katherine Johnson", description: "Orbital mechanics" },
  { id: "linus", label: "Linus Torvalds", description: "Kernels" },
];
/** A real app would search its users on the server here. */
const findPeople = (query: string) =>
  people.filter((person) => person.label.toLowerCase().includes(query.toLowerCase()));

// ?paragraphs=2000 swaps the first demo for a long document, to check performance.
const stressParagraphs = Number(new URLSearchParams(location.search).get("paragraphs")) || 0;
// ?ui=off renders the editor with no UI at all, as a baseline to compare against.
const bare = new URLSearchParams(location.search).get("ui") === "off";
const stressContent = Array.from(
  { length: stressParagraphs },
  (_unused, index) =>
    `<p>Paragraph ${index + 1}. The quick brown fox jumps over the lazy dog, <strong>again</strong> and <em>again</em>.</p>`,
).join("");

const demos = [
  { id: "simple", label: "Simple editor" },
  { id: "notion", label: "Notion-like editor" },
  { id: "custom", label: "Customized" },
  { id: "collab", label: "Collaboration" },
] as const;

type DemoId = (typeof demos)[number]["id"];

export function App() {
  const [demo, setDemo] = useState<DemoId>("simple");
  const [theme, setTheme] = useState<EditorTheme>("system");
  const [editable, setEditable] = useState(true);
  const [html, setHtml] = useState("");
  const [showHtml, setShowHtml] = useState(false);
  const latest = useRef<{ getHTML: () => string } | null>(null);

  // The page around the editor follows the editor's theme.
  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  const shared = {
    theme,
    onThemeChange: setTheme,
    editable,
    placeholder: "Write something, or type / for commands…",
    // Serialising on every keystroke is wasteful, so only do it while the output is shown.
    onUpdate: (editor: { getHTML: () => string }) => {
      latest.current = editor;
      if (showHtml) setHtml(editor.getHTML());
    },
  };

  return (
    <main className="page">
      <header className="page-header">
        <h1>OpenEdit</h1>
        <p>An open-source rich text editor. Everything is free.</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Demo">
        {demos.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={demo === id}
            onClick={() => setDemo(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {demo === "collab" && (
        <>
          <section className="split" aria-label="Collaborative editors">
            {collaborators.map((user, index) => (
              <div key={user.name} className="card">
                <RichTextEditor
                  features={[...defaultFeatures, "collab"]}
                  // Only one side offers starter content, so a new room is not seeded twice.
                  content={index === 0 ? collabContent : undefined}
                  collab={{
                    url: COLLAB_URL,
                    room: COLLAB_ROOM,
                    user,
                    // One browser copy of the document is enough for this page.
                    offline: index === 0,
                  }}
                  ui={{ Toolbar: CollabToolbar }}
                  {...shared}
                />
              </div>
            ))}
          </section>
          <p className="note">
            Two people, one document, synced through the collaboration server at{" "}
            <code>{COLLAB_URL}</code>. Take one side offline, edit both, then reconnect. Open this
            page in a second window to join the same room.
          </p>
        </>
      )}

      <section className="card" aria-label="Editor" hidden={demo === "collab"}>
        {demo === "simple" && bare && (
          <Editor key="bare" features={["basics"]} content={stressContent || simpleContent} />
        )}
        {demo === "simple" && !bare && (
          <RichTextEditor
            key="simple"
            content={stressContent || simpleContent}
            ui={{ Toolbar: ToolbarWithFileMenu }}
            ai={{ provider: aiProvider }}
            {...shared}
          />
        )}
        {demo === "notion" && (
          <RichTextEditor
            key="notion"
            content={notionContent}
            features={[...defaultFeatures, "math", "mentions"]}
            mentions={{ items: findPeople }}
            ui={{ Toolbar: QuietHeader }}
            {...shared}
          />
        )}
        {demo === "custom" && (
          <RichTextEditor
            key="custom"
            className="brand"
            content={customContent}
            ui={{ Toolbar: CompactToolbar }}
            {...shared}
          />
        )}
      </section>

      <footer className="page-footer">
        <label>
          <input
            type="checkbox"
            checked={editable}
            onChange={(event) => setEditable(event.target.checked)}
          />
          Editable
        </label>
        <details
          onToggle={(event) => {
            const open = event.currentTarget.open;
            setShowHtml(open);
            if (open && latest.current) setHtml(latest.current.getHTML());
          }}
        >
          <summary>HTML output</summary>
          <pre>{html || "Edit the document to see its HTML."}</pre>
        </details>
      </footer>
    </main>
  );
}
