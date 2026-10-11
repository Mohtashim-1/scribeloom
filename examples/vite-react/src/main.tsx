import type { DocumentJSON, OpenEditor } from "@openedit/core";
import { RichTextEditor } from "@openedit/ui";
import "@openedit/ui/styles.css";
import { StrictMode, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const STORAGE_KEY = "openedit-example-document";

function loadDocument(): DocumentJSON | string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as DocumentJSON;
  } catch {
    // Unreadable or blocked storage: start fresh.
  }
  return "<h1>Hello</h1><p>Edit me. Your changes are saved in this browser.</p>";
}

function App() {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Saving walks the whole document, so wait for a pause in typing.
  const save = (editor: OpenEditor) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(editor.getJSON()));
    }, 400);
  };

  return (
    <main>
      <RichTextEditor
        content={loadDocument()}
        placeholder="Write something, or type / for commands…"
        onUpdate={save}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
