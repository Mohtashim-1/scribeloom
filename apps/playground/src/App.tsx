import { collabColors } from "@openedit/extensions";
import type { EditorTheme, EditorUIProps } from "@openedit/react";
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
  useCollab,
} from "@openedit/ui";
import { List, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { collabContent, customContent, notionContent, simpleContent } from "./content";

const COLLAB_URL: string = import.meta.env.VITE_COLLAB_URL ?? "ws://localhost:1234";
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
    onUpdate: (editor: { getHTML: () => string }) => setHtml(editor.getHTML()),
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
        {demo === "simple" && <RichTextEditor key="simple" content={simpleContent} {...shared} />}
        {demo === "notion" && (
          <RichTextEditor
            key="notion"
            content={notionContent}
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
        <details>
          <summary>HTML output</summary>
          <pre>{html || "Edit the document to see its HTML."}</pre>
        </details>
      </footer>
    </main>
  );
}
