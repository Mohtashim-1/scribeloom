import { Extension } from "@tiptap/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createEditor,
  defineExtension,
  getEditor,
  registerFeature,
  type OpenEditor,
} from "./index";

let editor: OpenEditor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

describe("createEditor", () => {
  it("creates a detached editor with the basics feature by default", () => {
    editor = createEditor({ content: "<p>Hello <strong>world</strong></p>" });

    expect(editor.getHTML()).toBe("<p>Hello <strong>world</strong></p>");
    expect(editor.getText()).toBe("Hello world");
    expect(editor.isEmpty).toBe(false);
  });

  it("accepts JSON content", () => {
    editor = createEditor({
      content: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "Hi" }] }],
      },
    });

    expect(editor.getHTML()).toBe("<p>Hi</p>");
    expect(editor.getJSON().type).toBe("doc");
  });

  it("mounts into an element and unmounts again", () => {
    const element = document.createElement("div");
    editor = createEditor({ content: "<p>Hello</p>" });

    editor.mount(element);
    expect(element.querySelector("[contenteditable]")?.textContent).toBe("Hello");

    editor.unmount();
    expect(element.querySelector("[contenteditable]")).toBeNull();
    expect(editor.getHTML()).toBe("<p>Hello</p>");
  });

  it("mounts right away when given an element", () => {
    const element = document.createElement("div");
    editor = createEditor({ element, content: "<p>Hello</p>" });

    expect(element.textContent).toBe("Hello");
  });

  it("runs commands and reports active state", () => {
    editor = createEditor({ element: document.createElement("div"), content: "<p>Hello</p>" });

    editor.chain().selectAll().toggleBold().run();

    expect(editor.getHTML()).toBe("<p><strong>Hello</strong></p>");
    expect(editor.isActive("bold")).toBe(true);
    expect(editor.can().undo()).toBe(true);

    editor.commands.undo();
    expect(editor.getHTML()).toBe("<p>Hello</p>");
  });

  it("runs commands on a detached editor", () => {
    editor = createEditor({ content: "<p>Hello</p>" });

    editor.chain().selectAll().toggleItalic().run();

    expect(editor.getHTML()).toBe("<p><em>Hello</em></p>");
  });

  it("toggles editable", () => {
    editor = createEditor({ editable: false });
    expect(editor.isEditable).toBe(false);

    editor.setEditable(true);
    expect(editor.isEditable).toBe(true);
  });

  it("emits update events and stops after unsubscribing", () => {
    const onUpdate = vi.fn();
    const listener = vi.fn();
    editor = createEditor({ onUpdate });
    const off = editor.on("update", listener);

    editor.setContent("<p>One</p>");
    expect(onUpdate).toHaveBeenCalledWith(editor);
    expect(listener).toHaveBeenCalledTimes(1);

    off();
    editor.setContent("<p>Two</p>");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it("does not emit update when emitUpdate is false", () => {
    const onUpdate = vi.fn();
    editor = createEditor({ onUpdate });

    editor.setContent("<p>Quiet</p>", { emitUpdate: false });

    expect(editor.getText()).toBe("Quiet");
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("is destroyed only after destroy(), and emits destroy once", () => {
    const onDestroy = vi.fn();
    const local = createEditor();
    local.on("destroy", onDestroy);
    expect(local.isDestroyed).toBe(false);

    local.destroy();
    local.destroy();

    expect(local.isDestroyed).toBe(true);
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });
});

describe("basics", () => {
  it("includes highlight, alignment and task lists", () => {
    editor = createEditor({ element: document.createElement("div"), content: "<p>Hello</p>" });

    editor.chain().selectAll().toggleHighlight().setTextAlign("center").run();
    expect(editor.getHTML()).toBe('<p style="text-align: center;"><mark>Hello</mark></p>');

    editor.chain().setTextSelection(2).toggleTaskList().run();
    expect(editor.getHTML()).toContain('data-type="taskList"');
    expect(editor.has("taskItem")).toBe(true);
    expect(editor.has("table")).toBe(false);
  });
});

describe("selection helpers", () => {
  it("reports selection state and attributes", () => {
    editor = createEditor({
      element: document.createElement("div"),
      content: '<p><a href="https://example.com">link</a> text</p>',
    });
    expect(editor.isMounted).toBe(true);
    expect(getEditor(editor.engine)).toBe(editor);

    editor.chain().setTextSelection(2).run();
    expect(editor.isSelectionEmpty).toBe(true);
    expect(editor.getAttributes("link").href).toBe("https://example.com");
    expect(editor.selectedNodeName).toBeNull();
    expect(editor.getNodeRect("table")).toBeNull();
  });

  it("returns no rectangles while detached", () => {
    editor = createEditor({ content: "<p>Hello</p>" });

    expect(editor.isMounted).toBe(false);
    expect(editor.isFocused).toBe(false);
    expect(editor.getSelectionRect()).toBeNull();
  });
});

describe("features", () => {
  it("throws on an unknown feature name", () => {
    // @ts-expect-error "nope" is not a registered feature name
    expect(() => createEditor({ features: ["nope"] })).toThrow(/Unknown feature "nope"/);
  });

  it("accepts extensions made with defineExtension", () => {
    const onCreate = vi.fn();
    const custom = defineExtension({
      name: "custom",
      engine: () => Extension.create({ name: "custom", onCreate }),
    });
    editor = createEditor({ element: document.createElement("div"), features: ["basics", custom] });

    expect(editor.engine.extensionManager.extensions.some((e) => e.name === "custom")).toBe(true);
  });

  it("enables registered features by name and de-duplicates them", () => {
    const engine = vi.fn(() => Extension.create({ name: "registered" }));
    registerFeature("registered", () => defineExtension({ name: "registered", engine }));

    editor = createEditor({
      // @ts-expect-error not declared in FeatureRegistry in this test
      features: ["basics", "registered", "registered"],
    });

    expect(engine).toHaveBeenCalledTimes(1);
  });

  it("requires a name", () => {
    expect(() => defineExtension({ name: "", engine: () => [] })).toThrow(/name/);
  });
});
