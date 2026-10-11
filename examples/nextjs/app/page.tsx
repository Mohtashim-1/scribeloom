import { DocumentEditor } from "./document-editor";

// A server component: load the document here and pass it down.
export default function Page() {
  const content =
    "<h1>Hello from the server</h1><p>This content was passed from a server component.</p>";
  return (
    <main>
      <DocumentEditor initialContent={content} />
    </main>
  );
}
