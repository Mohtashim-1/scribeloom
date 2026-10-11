import { createEditor, type EditorOptions, type OpenEditor } from "@openedit/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import {
  collab,
  comments,
  getComments,
  memoryCommentsAdapter,
  restCommentsAdapter,
  type CommentThread,
} from "./index";

const editors: OpenEditor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

function mount(features: EditorOptions["features"], content = "<p>The quick brown fox</p>") {
  const editor = createEditor({ element: document.createElement("div"), features, content });
  editors.push(editor);
  return editor;
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const select = (editor: OpenEditor, word: string) => {
  const from = editor.getText().indexOf(word) + 1;
  editor
    .chain()
    .setTextSelection({ from, to: from + word.length })
    .run();
};

describe("comments", () => {
  it("anchors a thread to the selection and records the author", () => {
    const editor = mount(["basics", comments({ user: { name: "Ada" } })]);
    const api = getComments(editor)!;
    select(editor, "quick");

    const id = api.addThread("  Is this the right word?  ")!;

    expect(editor.getHTML()).toContain(
      `<span data-thread-id="${id}" class="oe-comment">quick</span>`,
    );
    const [thread] = api.store.getState().threads;
    expect(thread).toMatchObject({ id, quote: "quick", orphaned: false, resolved: false });
    expect(thread!.comments[0]).toMatchObject({
      body: "Is this the right word?",
      author: { name: "Ada" },
    });
    expect(api.store.getState().activeThreadId).toBe(id);
  });

  it("needs a selection and a non-empty comment", () => {
    const editor = mount(["basics", "comments"]);
    const api = getComments(editor)!;

    expect(api.canComment()).toBe(false);
    expect(api.addThread("no selection")).toBeNull();
    select(editor, "quick");
    expect(api.addThread("   ")).toBeNull();
    expect(api.store.getState().threads).toHaveLength(0);
  });

  it("keeps the anchor on the same text while the document is edited around it", async () => {
    const editor = mount(["basics", "comments"]);
    const api = getComments(editor)!;
    select(editor, "brown");
    api.addThread("colour?");

    editor.chain().setTextSelection(1).insertContent("Suddenly, ").run();
    editor.chain().focus("end").insertContent(" jumps").run();
    await tick();

    expect(editor.getText()).toBe("Suddenly, The quick brown fox jumps");
    expect(api.store.getState().threads[0]).toMatchObject({ quote: "brown", orphaned: false });
  });

  it("flags a thread as orphaned when its text is deleted", async () => {
    const editor = mount(["basics", "comments"]);
    const api = getComments(editor)!;
    select(editor, "brown");
    api.addThread("colour?");

    select(editor, "brown ");
    editor.chain().deleteSelection().run();
    await tick();

    expect(api.store.getState().threads[0]).toMatchObject({ quote: "", orphaned: true });
  });

  it("supports replies, resolving and reopening", () => {
    const editor = mount(["basics", "comments"]);
    const api = getComments(editor)!;
    select(editor, "fox");
    const id = api.addThread("which fox?")!;

    api.reply(id, "the red one");
    api.reply(id, "   ");
    api.resolve(id);
    expect(api.store.getState().threads[0]).toMatchObject({ resolved: true });
    expect(api.store.getState().threads[0]!.comments.map((c) => c.body)).toEqual([
      "which fox?",
      "the red one",
    ]);

    api.reopen(id);
    expect(api.store.getState().threads[0]!.resolved).toBe(false);
  });

  it("removes the highlight when a thread is deleted", () => {
    const editor = mount(["basics", "comments"]);
    const api = getComments(editor)!;
    select(editor, "fox");
    const id = api.addThread("which fox?")!;

    api.remove(id);

    expect(editor.getHTML()).toBe("<p>The quick brown fox</p>");
    expect(api.store.getState().threads).toHaveLength(0);
  });

  it("lists threads in document order and allows overlapping ones", async () => {
    const editor = mount(["basics", "comments"]);
    const api = getComments(editor)!;
    select(editor, "fox");
    api.addThread("second in the text");
    select(editor, "quick brown");
    api.addThread("first in the text");
    select(editor, "brown fox");
    api.addThread("overlaps both");
    await tick();

    expect(api.store.getState().threads.map((thread) => thread.quote)).toEqual([
      "quick brown",
      "brown fox",
      "fox",
    ]);
  });

  it("makes the thread under the cursor active", async () => {
    const editor = mount(["basics", "comments"]);
    const api = getComments(editor)!;
    select(editor, "quick");
    const first = api.addThread("one")!;
    select(editor, "fox");
    const second = api.addThread("two")!;
    expect(api.store.getState().activeThreadId).toBe(second);

    editor
      .chain()
      .setTextSelection(editor.getText().indexOf("quick") + 3)
      .run();
    await tick();

    expect(api.store.getState().activeThreadId).toBe(first);
  });

  it("does not put comment anchors in the undo history", () => {
    const editor = mount(["basics", "comments"]);
    select(editor, "quick");
    getComments(editor)!.addThread("note");

    expect(editor.can().undo()).toBe(false);
  });

  it("is absent without the feature", () => {
    expect(getComments(mount(["basics"]))).toBeNull();
  });
});

describe("comments with collaboration", () => {
  it("shares threads and anchors through the collaborative document", async () => {
    const docA = new Y.Doc();
    const docB = new Y.Doc();
    docA.on(
      "update",
      (update: Uint8Array, origin: unknown) => origin !== docB && Y.applyUpdate(docB, update, docA),
    );
    docB.on(
      "update",
      (update: Uint8Array, origin: unknown) => origin !== docA && Y.applyUpdate(docA, update, docB),
    );
    const join = (name: string, document: Y.Doc) =>
      mount(
        ["basics", collab({ room: "c", user: { name, color: "#3e63dd" }, document }), "comments"],
        "",
      );
    const ada = join("Ada", docA);
    const grace = join("Grace", docB);
    ada.chain().insertContent("The quick brown fox").run();

    select(ada, "quick");
    const id = getComments(ada)!.addThread("from Ada")!;
    getComments(grace)!.reply(id, "from Grace");
    // Grace edits around the comment while it exists.
    grace.chain().setTextSelection(1).insertContent("Look: ").run();
    await tick();

    for (const editor of [ada, grace]) {
      const [thread] = getComments(editor)!.store.getState().threads;
      expect(thread).toMatchObject({ id, quote: "quick", orphaned: false });
      expect(thread!.comments.map((c) => `${c.author.name}: ${c.body}`)).toEqual([
        "Ada: from Ada",
        "Grace: from Grace",
      ]);
    }
    expect(ada.getText()).toBe("Look: The quick brown fox");
  });
});

describe("adapters", () => {
  const thread = (id: string): CommentThread => ({
    id,
    resolved: false,
    createdAt: 1,
    comments: [{ id: `${id}-1`, author: { name: "Ada" }, body: "hi", createdAt: 1 }],
  });

  it("memory adapter loads initial threads and reports changes", () => {
    const onChange = vi.fn();
    const adapter = memoryCommentsAdapter({ initial: [thread("a")], onChange });

    void adapter.setResolved("a", true);

    expect(adapter.getThreads()[0]!.resolved).toBe(true);
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: "a", resolved: true })]);
  });

  it("REST adapter loads, sends changes, and rolls back when the server refuses", async () => {
    const calls: string[] = [];
    let failNext = false;
    const fakeFetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(`${init?.method} ${String(url)}`);
      if (failNext) return new Response("no", { status: 500 });
      return new Response(JSON.stringify(init?.method === "GET" ? [thread("a")] : {}), {
        status: 200,
      });
    });
    const adapter = restCommentsAdapter({
      url: "https://api.test/threads/",
      headers: () => ({ Authorization: "Bearer t" }),
      fetch: fakeFetch as unknown as typeof fetch,
    });
    await adapter.ready;
    expect(adapter.getThreads().map((t) => t.id)).toEqual(["a"]);

    await adapter.createThread(thread("b"));
    await adapter.addComment("a", { id: "a-2", author: { name: "G" }, body: "yo", createdAt: 2 });
    await adapter.setResolved("a", true);
    expect(calls).toEqual([
      "GET https://api.test/threads",
      "POST https://api.test/threads",
      "POST https://api.test/threads/a/comments",
      "PATCH https://api.test/threads/a",
    ]);
    expect(fakeFetch.mock.calls[1]![1]!.headers).toMatchObject({ Authorization: "Bearer t" });

    failNext = true;
    await expect(adapter.deleteThread("a")).rejects.toThrow(/DELETE \/a \(500\)/);
    expect(
      adapter
        .getThreads()
        .map((t) => t.id)
        .sort(),
    ).toEqual(["a", "b"]);
  });
});
