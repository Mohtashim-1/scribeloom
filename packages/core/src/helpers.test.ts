import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { basics, createEditor, createStore, hasFeature, type OpenEditor } from "./index";

let editor: OpenEditor | undefined;
afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

beforeAll(() => {
  // The simulated DOM has no layout, so give ranges and elements a fixed box.
  const box = () => new DOMRect(10, 20, 30, 40);
  Range.prototype.getClientRects = () => [box()] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = box;
  Element.prototype.getBoundingClientRect = box;
});

const mount = (content: string, options = {}) =>
  (editor = createEditor({ element: document.createElement("div"), content, ...options }));

describe("createStore", () => {
  it("holds a value and notifies subscribers until they unsubscribe", () => {
    const store = createStore({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.setState({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("hasFeature", () => {
  it("finds features given by name or as extensions, and defaults to basics", () => {
    expect(hasFeature({}, "basics")).toBe(true);
    expect(hasFeature({ features: [basics()] }, "basics")).toBe(true);
    expect(hasFeature({ features: ["basics"] }, "collab")).toBe(false);
  });
});

describe("basics options", () => {
  it("can leave out undo history", () => {
    mount("<p>Hi</p>", { features: [basics({ history: false })] });
    expect(editor!.has("undoRedo")).toBe(false);
    expect(editor!.has("bold")).toBe(true);
  });

  it("shows the placeholder on an empty document", () => {
    mount("", { placeholder: "Write here" });
    expect(editor!.element!.querySelector("p")?.getAttribute("data-placeholder")).toBe(
      "Write here",
    );
  });
});

describe("rectangles and selection", () => {
  it("reports the selection and arbitrary ranges, clamped to the document", () => {
    mount("<p>Hello world</p>");
    editor!.chain().setTextSelection({ from: 1, to: 6 }).run();

    expect(editor!.isSelectionEmpty).toBe(false);
    expect(editor!.getSelectionRect()).toMatchObject({ width: 30, height: 40 });
    expect(editor!.getRangeRect(-5, 9999)).not.toBeNull();
  });

  it("finds the block around the cursor by type", () => {
    mount("<blockquote><p>Quoted</p></blockquote><p>Plain</p>");
    editor!.chain().setTextSelection(3).run();

    expect(editor!.getNodeRect("blockquote")).toMatchObject({ left: 10, top: 20 });
    expect(editor!.getNodeRect("codeBlock")).toBeNull();
  });

  it("reports a node selected as a whole", () => {
    mount("<p>Above</p><hr><p>Below</p>");
    editor!.chain().setNodeSelection(7).run();

    expect(editor!.selectedNodeName).toBe("horizontalRule");
    expect(editor!.getNodeRect("horizontalRule")).not.toBeNull();
  });

  it("returns nothing for rectangles while detached", () => {
    editor = createEditor({ content: "<p>Hello</p>" });
    expect(editor.element).toBeNull();
    expect(editor.getRangeRect(1, 3)).toBeNull();
    expect(editor.getNodeRect("paragraph")).toBeNull();
  });
});

describe("state queries and events", () => {
  it("checks activity by attributes alone", () => {
    mount('<p style="text-align: center">Centred</p>');
    editor!.chain().setTextSelection(2).run();

    expect(editor!.isActive({ textAlign: "center" })).toBe(true);
    expect(editor!.isActive({ textAlign: "right" })).toBe(false);
  });

  it("emits mount and unmount, and focuses on request", async () => {
    editor = createEditor({ content: "<p>Hello</p>" });
    const onMount = vi.fn();
    const onUnmount = vi.fn();
    editor.on("mount", onMount);
    editor.on("unmount", onUnmount);
    const host = document.createElement("div");
    document.body.append(host);

    editor.mount(host);
    expect(onMount).toHaveBeenCalledWith(editor);
    editor.focus("end");
    // Focus is applied on the next frame.
    await vi.waitFor(() => expect(editor!.isFocused).toBe(true));

    editor.unmount();
    expect(onUnmount).toHaveBeenCalledTimes(1);
    expect(editor.isMounted).toBe(false);
    host.remove();
  });

  it("applies the autofocus and editable options", () => {
    mount("<p>Read me</p>", { editable: false, autofocus: "end" });
    expect(editor!.isEditable).toBe(false);
    expect(editor!.element!.getAttribute("contenteditable")).toBe("false");
  });
});
