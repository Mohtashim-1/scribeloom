import { createEditor, type OpenEditor } from "@openedit/core";
import { afterEach, describe, expect, it } from "vitest";
import { getSuggestions, suggestions } from "./index";

const editors: OpenEditor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

function mount(content = "<p>The quick brown fox</p>", enabled = true) {
  const editor = createEditor({
    element: document.createElement("div"),
    features: ["basics", suggestions({ user: { name: "Ada" }, enabled })],
    content,
  });
  editors.push(editor);
  return { editor, api: getSuggestions(editor)! };
}
/** The document with suggestions shown as {+added+} and {-removed-}. */
const marked = (editor: OpenEditor) =>
  editor
    .getHTML()
    .replace(/<ins[^>]*>(.*?)<\/ins>/g, "{+$1+}")
    .replace(/<del[^>]*>(.*?)<\/del>/g, "{-$1-}");
const at = (editor: OpenEditor, text: string) => editor.getText().indexOf(text) + 1;
const press = (editor: OpenEditor, key: string) =>
  editor.engine.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

describe("suggestion mode", () => {
  it("marks typed text as an insertion, as one suggestion", () => {
    const { editor, api } = mount();
    editor.chain().setTextSelection(at(editor, "brown")).run();

    for (const char of "very ") editor.chain().insertContent(char).run();

    expect(marked(editor)).toBe("<p>The quick {+very +}brown fox</p>");
    expect(api.store.getState().suggestions).toEqual([
      expect.objectContaining({ inserted: "very ", deleted: "", author: "Ada" }),
    ]);
  });

  it("keeps deleted text, marked as a deletion", () => {
    const { editor, api } = mount();
    const from = at(editor, "quick ");

    editor
      .chain()
      .deleteRange({ from, to: from + 6 })
      .run();

    expect(marked(editor)).toBe("<p>The {-quick -}brown fox</p>");
    expect(editor.getText()).toBe("The quick brown fox");
    expect(api.store.getState().suggestions[0]).toMatchObject({ inserted: "", deleted: "quick " });
  });

  it("groups character-by-character backspacing into one suggestion", () => {
    const { editor, api } = mount();
    let pos = at(editor, "brown") + 5;
    editor.chain().setTextSelection(pos).run();

    for (let i = 0; i < 5; i++) {
      press(editor, "Backspace");
      editor
        .chain()
        .deleteRange({ from: pos - 1, to: pos })
        .run();
      // The cursor must end up before the kept text, ready for the next press.
      expect(editor.engine.state.selection.from).toBe(pos - 1);
      pos -= 1;
    }

    expect(marked(editor)).toBe("<p>The quick {-brown-} fox</p>");
    expect(api.store.getState().suggestions).toHaveLength(1);
  });

  it("moves the cursor past the text when deleting forwards", () => {
    const { editor } = mount();
    const pos = at(editor, "quick");
    editor.chain().setTextSelection(pos).run();

    press(editor, "Delete");
    editor
      .chain()
      .deleteRange({ from: pos, to: pos + 1 })
      .run();

    expect(marked(editor)).toBe("<p>The {-q-}uick brown fox</p>");
    expect(editor.engine.state.selection.from).toBe(pos + 1);
  });

  it("records typing over a selection as one replacement", () => {
    const { editor, api } = mount();
    const from = at(editor, "quick");

    editor
      .chain()
      .insertContentAt({ from, to: from + 5 }, "slow")
      .run();

    expect(marked(editor)).toBe("<p>The {-quick-}{+slow+} brown fox</p>");
    expect(api.store.getState().suggestions).toEqual([
      expect.objectContaining({ deleted: "quick", inserted: "slow" }),
    ]);
  });

  it("really deletes text that was only a pending insertion", () => {
    const { editor, api } = mount();
    const pos = at(editor, "brown");
    editor.chain().setTextSelection(pos).insertContent("very ").run();

    editor
      .chain()
      .deleteRange({ from: pos, to: pos + 5 })
      .run();

    expect(marked(editor)).toBe("<p>The quick brown fox</p>");
    expect(api.store.getState().suggestions).toHaveLength(0);
  });

  it("accepts a suggestion: added text stays, removed text goes", () => {
    const { editor, api } = mount();
    const from = at(editor, "quick");
    editor
      .chain()
      .insertContentAt({ from, to: from + 5 }, "slow")
      .run();

    api.accept(api.store.getState().suggestions[0]!.id);

    expect(editor.getHTML()).toBe("<p>The slow brown fox</p>");
    expect(api.store.getState().suggestions).toHaveLength(0);
  });

  it("rejects a suggestion: the original text comes back", () => {
    const { editor, api } = mount();
    const from = at(editor, "quick");
    editor
      .chain()
      .insertContentAt({ from, to: from + 5 }, "slow")
      .run();

    api.reject(api.store.getState().suggestions[0]!.id);

    expect(editor.getHTML()).toBe("<p>The quick brown fox</p>");
  });

  it("accepts or rejects everything at once, leaving other suggestions alone when given an id", () => {
    const { editor, api } = mount();
    editor.chain().setTextSelection(at(editor, "fox")).insertContent("red ").run();
    const from = at(editor, "The ");
    editor
      .chain()
      .deleteRange({ from, to: from + 4 })
      .run();
    const [first] = api.store.getState().suggestions;
    expect(api.store.getState().suggestions).toHaveLength(2);

    api.reject(first!.id);
    expect(marked(editor)).toBe("<p>The quick brown {+red +}fox</p>");

    api.acceptAll();
    expect(editor.getHTML()).toBe("<p>The quick brown red fox</p>");

    editor.chain().focus("end").insertContent("!").run();
    api.rejectAll();
    expect(editor.getHTML()).toBe("<p>The quick brown red fox</p>");
  });

  it("applies edits directly when the mode is off, and can be toggled", () => {
    const { editor, api } = mount(undefined, false);
    editor.chain().focus("end").insertContent("!").run();
    expect(editor.getHTML()).toBe("<p>The quick brown fox!</p>");

    api.setEnabled(true);
    editor.chain().focus("end").insertContent("?").run();
    expect(marked(editor)).toBe("<p>The quick brown fox!{+?+}</p>");
  });

  it("marks text added by a structural change, without blocking it", () => {
    const { editor } = mount("<p>One</p>");

    editor.chain().focus("end").insertContent("<p>Two</p>").run();

    expect(editor.getText()).toContain("Two");
    expect(marked(editor)).toContain("{+Two+}");
  });

  it("reads suggestions that are already in the content", async () => {
    const { editor, api } = mount(
      '<p>Hi <ins data-suggestion-id="s1" data-author="Grace" data-created-at="5">there</ins></p>',
      false,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(api.store.getState().suggestions).toEqual([
      { id: "s1", author: "Grace", createdAt: 5, inserted: "there", deleted: "" },
    ]);
    expect(getSuggestions(editor)).toBe(api);
  });
});
