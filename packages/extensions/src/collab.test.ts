import { createEditor, type OpenEditor } from "@openedit/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { collab, collabColorFor, collabColors, getCollab } from "./index";

const editors: OpenEditor[] = [];

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

/** A mounted editor on a local shared document (no server). */
function join(name: string, document: Y.Doc, initialContent?: string) {
  const editor = createEditor({
    element: globalThis.document.createElement("div"),
    features: [
      "basics",
      collab({ room: "test", user: { name, color: "#3e63dd" }, document, initialContent }),
    ],
  });
  editors.push(editor);
  return editor;
}

/** Wires two Yjs documents together, as a server would. */
function link(a: Y.Doc, b: Y.Doc) {
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
  a.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin !== b) Y.applyUpdate(b, update, a);
  });
  b.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin !== a) Y.applyUpdate(a, update, b);
  });
}

describe("collab", () => {
  it("syncs edits between two editors, in both directions", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    link(docA, docB);
    const ada = join("Ada", docA);
    const grace = join("Grace", docB);

    ada.chain().insertContent("Hello from Ada").run();
    expect(grace.getText()).toBe("Hello from Ada");

    grace.chain().selectAll().toggleBold().run();
    expect(ada.getHTML()).toBe("<p><strong>Hello from Ada</strong></p>");
  });

  it("merges edits made while disconnected", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    const ada = join("Ada", docA);
    const grace = join("Grace", docB);
    ada.chain().insertContent("shared").run();
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

    // Both edit while apart.
    ada.chain().setTextSelection(1).insertContent("A-").run();
    grace.chain().focus("end").insertContent("-B").run();
    expect(ada.getText()).not.toBe(grace.getText());

    link(docA, docB);
    expect(ada.getText()).toBe("A-shared-B");
    expect(grace.getText()).toBe("A-shared-B");
  });

  it("undoes only the local user's changes", () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    link(docA, docB);
    const ada = join("Ada", docA);
    const grace = join("Grace", docB);

    ada.chain().insertContent("Ada. ").run();
    grace.chain().focus("end").insertContent("Grace.").run();
    ada.commands.undo();

    expect(grace.getText()).toBe("Grace.");
  });

  it("seeds an empty document once, and not a document with content", async () => {
    const doc = new Y.Doc();
    const first = join("Ada", doc, "<p>Seed</p>");
    // Seeding waits for the editor to finish starting up.
    await vi.waitFor(() => expect(first.getText()).toBe("Seed"));

    const second = join("Grace", doc, "<p>Seed</p>");
    await vi.waitFor(() => expect(getCollab(second)!.store.getState().synced).toBe(true));
    expect(second.getText()).toBe("Seed");
  });

  it("reports status and the local user as a peer", async () => {
    const editor = join("  Ada  ", new Y.Doc());
    await vi.waitFor(() => expect(getCollab(editor)!.store.getState().synced).toBe(true));
    const state = getCollab(editor)!.store.getState();

    expect(state.status).toBe("local");
    expect(state.synced).toBe(true);
    expect(state.peers).toEqual([
      { clientId: expect.any(Number), name: "Ada", color: "#3e63dd", isSelf: true },
    ]);
  });

  it("does not trust presence data from other clients", () => {
    const editor = join("Ada", new Y.Doc());
    const session = getCollab(editor)!;
    // Simulate a remote client announcing itself with hostile values.
    session.awareness.states.set(999, {
      user: { name: "x".repeat(200), color: "red; background: url(https://evil.test)" },
    });
    session.awareness.emit("change", [{ added: [999], updated: [], removed: [] }, "remote"]);

    const remote = session.store.getState().peers.find((peer) => peer.clientId === 999)!;
    expect(remote.name).toHaveLength(40);
    expect(remote.color).toBe("#6e6e7a");
    expect(remote.isSelf).toBe(false);
  });

  it("requires the collab option when enabled by name", () => {
    expect(() => createEditor({ features: ["basics", "collab"] })).toThrow(
      /needs the `collab` option/,
    );
  });

  it("is enabled by name with the collab option, and is absent otherwise", async () => {
    const editor = createEditor({
      element: globalThis.document.createElement("div"),
      features: ["basics", "collab"],
      content: "<p>From options</p>",
      collab: { room: "by-name", user: { name: "Ada", color: "#3e63dd" } },
    });
    editors.push(editor);
    await vi.waitFor(() => expect(editor.getText()).toBe("From options"));
    expect(editor.has("undoRedo")).toBe(false);

    const plain = createEditor({ features: ["basics"] });
    editors.push(plain);
    expect(getCollab(plain)).toBeNull();
  });

  it("picks stable colours", () => {
    expect(collabColorFor("ada")).toBe(collabColorFor("ada"));
    expect(collabColors).toContain(collabColorFor("grace"));
  });
});
