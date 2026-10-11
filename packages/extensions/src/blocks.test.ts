import { createEditor, type EditorOptions, type OpenEditor } from "@openedit/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBlockHandle, getMath, getMentions, getSlashMenu, mentions } from "./index";

const editors: OpenEditor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

function mount(features: EditorOptions["features"], content = "<p>Hello</p>") {
  const editor = createEditor({ element: document.createElement("div"), features, content });
  editors.push(editor);
  return editor;
}
const press = (editor: OpenEditor, key: string) =>
  editor.engine.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

describe("callouts", () => {
  it("wraps blocks, changes type, and unwraps", () => {
    const editor = mount(["basics", "callouts"]);

    editor.chain().setCallout("warning").run();
    expect(editor.getHTML()).toContain(
      '<div data-callout="warning" class="oe-callout" role="note"><p>Hello</p></div>',
    );

    editor.chain().setCallout("success").run();
    expect(editor.getHTML()).toContain('data-callout="success"');

    editor.chain().unsetCallout().run();
    expect(editor.getHTML()).not.toContain("data-callout");
  });

  it("parses saved callouts and falls back to info for unknown types", () => {
    const editor = mount(["basics", "callouts"], '<div data-callout="bogus"><p>Note</p></div>');
    expect(editor.getHTML()).toContain('data-callout="info"');
  });
});

describe("columns", () => {
  it("inserts between two and four columns", () => {
    const editor = mount(["basics", "columns"], "<p></p>");

    editor.chain().setColumns(9).run();

    const dom = editor.engine.view.dom;
    expect(dom.querySelector(".oe-columns")?.getAttribute("data-columns")).toBe("4");
    expect(dom.querySelectorAll(".oe-column")).toHaveLength(4);
  });

  it("stacks the content again when columns are removed", () => {
    const editor = mount(
      ["basics", "columns"],
      '<div data-columns="2"><div data-column><p>Left</p><p>More left</p></div><div data-column><p>Right</p></div></div>',
    );
    editor.chain().setTextSelection(4).run();

    editor.chain().unsetColumns().run();

    expect(editor.getHTML()).toMatch(/^<p>Left<\/p><p>More left<\/p><p>Right<\/p>/);
    expect(editor.getHTML()).not.toContain("data-column");
  });
});

describe("toggles", () => {
  it("turns a block into a collapsible section and back", () => {
    const editor = mount(["basics", "toggles"]);

    editor.chain().setDetails().run();
    expect(editor.has("details")).toBe(true);
    // The block becomes the body; the summary line starts empty, ready to type.
    const details = editor.engine.view.dom.querySelector('[data-type="details"]');
    expect(details?.querySelector("summary")).not.toBeNull();
    expect(details?.querySelector('[data-type="detailsContent"]')?.textContent).toBe("Hello");

    editor.chain().unsetDetails().run();
    expect(editor.engine.view.dom.querySelector("summary")).toBeNull();
  });
});

describe("math", () => {
  it("inserts a formula, opens it for editing, updates and removes it", () => {
    const editor = mount(["basics", "math"], "<p></p>");
    const api = getMath(editor)!;

    api.insert({ latex: "a^2 + b^2", block: true });
    expect(api.store.getState().editing).toMatchObject({ latex: "a^2 + b^2", block: true });
    expect(editor.engine.view.dom.querySelector(".katex")).not.toBeNull();

    api.update("c^2");
    expect(editor.getJSON().content?.some((node) => node.attrs?.latex === "c^2")).toBe(true);

    api.update("  ");
    expect(api.store.getState().editing).toBeNull();
    expect(editor.engine.view.dom.querySelector(".katex")).toBeNull();
  });

  it("shows invalid LaTeX as an error instead of throwing", () => {
    const editor = mount(["basics", "math"], "<p></p>");
    expect(() => getMath(editor)!.insert({ latex: "\\frac{", block: true })).not.toThrow();
  });
});

describe("mentions", () => {
  // The simulated DOM has no live selection for the engine to collapse after inserting.
  vi.spyOn(Selection.prototype, "collapseToEnd").mockImplementation(() => {});

  const people = [
    { id: "1", label: "Ada Lovelace" },
    { id: "2", label: "Alan Turing" },
    { id: "3", label: "Grace Hopper" },
  ];
  const find = (query: string) =>
    people.filter((person) => person.label.toLowerCase().includes(query.toLowerCase()));

  it("lists matches for the query and inserts the picked person", () => {
    const editor = mount(["basics", mentions({ items: find })], "<p></p>");
    const api = getMentions(editor)!;

    editor.chain().insertContent("@a").run();
    expect(api.store.getState()).toMatchObject({ open: true, query: "a" });
    expect(api.store.getState().items.map((item) => item.label)).toEqual([
      "Ada Lovelace",
      "Alan Turing",
      "Grace Hopper",
    ]);

    press(editor, "ArrowDown");
    press(editor, "Enter");

    expect(editor.getText()).toBe("@Alan Turing ");
    expect(editor.engine.view.dom.querySelector(".oe-mention")?.getAttribute("data-id")).toBe("2");
    expect(api.store.getState().open).toBe(false);
  });

  it("supports async searches and ignores results that arrive out of order", async () => {
    const resolvers: Array<(items: typeof people) => void> = [];
    const editor = mount(
      ["basics", mentions({ items: () => new Promise((resolve) => resolvers.push(resolve)) })],
      "<p></p>",
    );
    const api = getMentions(editor)!;

    editor.chain().insertContent("@g").run();
    editor.chain().insertContent("r").run();
    // The menu follows the typing a moment later.
    await vi.waitFor(() => expect(resolvers).toHaveLength(2));
    expect(api.store.getState().loading).toBe(true);
    // The later search answers first; the earlier one must not overwrite it.
    resolvers.at(-1)!([people[2]!]);
    await vi.waitFor(() => expect(api.store.getState().loading).toBe(false));
    resolvers[0]!(people);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(api.store.getState().items.map((item) => item.label)).toEqual(["Grace Hopper"]);
  });

  it("offers nobody when no source is configured", () => {
    const editor = mount(["basics", "mentions"], "<p></p>");
    editor.chain().insertContent("@x").run();
    expect(getMentions(editor)!.store.getState().items).toEqual([]);
  });
});

describe("block handle", () => {
  const three = "<p>One</p><p>Two</p><p>Three</p>";
  const point = (editor: OpenEditor, text: string) => {
    const api = getBlockHandle(editor)!;
    let pos = 0;
    editor.engine.state.doc.forEach((node, offset) => {
      if (node.textContent === text) pos = offset;
    });
    api.store.setState({ pos, type: "paragraph" });
    return api;
  };

  it("finds the block under the pointer", () => {
    const editor = mount(["basics", "block-handle"], three);
    const second = editor.engine.view.dom.children[1]!;

    second.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }));

    expect(getBlockHandle(editor)!.store.getState()).toEqual({ pos: 5, type: "paragraph" });
  });

  it("moves, duplicates and deletes blocks", () => {
    const editor = mount(["basics", "block-handle"], three);

    point(editor, "Two").move(-1);
    expect(editor.getHTML()).toBe("<p>Two</p><p>One</p><p>Three</p>");

    point(editor, "Two").move(1);
    point(editor, "Two").move(1);
    expect(editor.getHTML()).toBe("<p>One</p><p>Three</p><p>Two</p>");
    // Nothing below the last block.
    point(editor, "Two").move(1);
    expect(editor.getHTML()).toBe("<p>One</p><p>Three</p><p>Two</p>");

    point(editor, "One").duplicate();
    expect(editor.getHTML()).toBe("<p>One</p><p>One</p><p>Three</p><p>Two</p>");

    point(editor, "Three").remove();
    expect(editor.getHTML()).toBe("<p>One</p><p>One</p><p>Two</p>");
    expect(getBlockHandle(editor)!.store.getState().pos).toBeNull();
  });

  it("inserts an empty paragraph below and moves the cursor there", () => {
    const editor = mount(["basics", "block-handle"], three);

    point(editor, "One").insertBelow();
    editor.chain().insertContent("New").run();

    expect(editor.getHTML()).toBe("<p>One</p><p>New</p><p>Two</p><p>Three</p>");
  });

  it("keeps pointing at the same block when text is added above it", () => {
    const editor = mount(["basics", "block-handle"], three);
    const api = point(editor, "Three");

    editor.chain().insertContentAt(1, "Zero and ").run();

    expect(editor.engine.state.doc.nodeAt(api.store.getState().pos!)?.textContent).toBe("Three");
  });
});

describe("slash menu contributions", () => {
  it("lists entries from the block features that are enabled", () => {
    const editor = mount(
      ["basics", "slash-menu", "callouts", "columns", "toggles", "math"],
      "<p></p>",
    );
    editor.chain().insertContent("/").run();
    const ids = getSlashMenu(editor)!
      .store.getState()
      .items.map((item) => item.id);

    expect(ids).toEqual(
      expect.arrayContaining(["callout", "columns2", "columns3", "toggle", "math"]),
    );
  });
});
