"use client";

import { RichTextEditor } from "@openedit/ui";

/**
 * The editor needs the browser, so it is a client component. On the server it
 * renders an empty frame, which the client fills in: no hydration mismatch.
 */
export function DocumentEditor({ initialContent }: { initialContent: string }) {
  return (
    <RichTextEditor
      content={initialContent}
      placeholder="Write something, or type / for commands…"
      onUpdate={(editor) => {
        // Send editor.getJSON() to a route handler or server action here,
        // debounced: it walks the whole document.
        void editor;
      }}
    />
  );
}
