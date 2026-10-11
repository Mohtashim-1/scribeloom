import { createEditor, type EditorOptions, type OpenEditor } from "@openedit/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultSlashMenuItems,
  filterSlashMenuItems,
  getSlashMenu,
  images,
  insertImageFiles,
  slashMenu,
} from "./index";

let editor: OpenEditor | undefined;

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

function mount(features: EditorOptions["features"]) {
  editor = createEditor({ element: document.createElement("div"), features });
  return editor;
}

describe("tables", () => {
  it("is enabled by name and inserts a table", () => {
    const e = mount(["basics", "tables"]);

    e.chain().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run();

    expect(e.has("table")).toBe(true);
    expect(e.getHTML()).toContain("<table");
    expect(e.engine.view.dom.querySelectorAll("th")).toHaveLength(3);
    expect(e.engine.view.dom.querySelectorAll("td")).toHaveLength(3);
  });

  it("adds and removes rows", () => {
    const e = mount(["basics", "tables"]);
    e.chain().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();

    e.chain().addRowAfter().run();
    expect(e.engine.view.dom.querySelectorAll("tr")).toHaveLength(3);

    e.chain().deleteTable().run();
    expect(e.getHTML()).not.toContain("<table");
  });
});

describe("images", () => {
  const png = () => new File(["x"], "cat.png", { type: "image/png" });

  it("uploads files and inserts them", async () => {
    const upload = vi.fn(async (file: File) => `https://cdn.test/${file.name}`);
    const e = mount(["basics", images({ upload })]);

    const count = await insertImageFiles(e, [png()]);

    expect(count).toBe(1);
    expect(upload).toHaveBeenCalledTimes(1);
    const img = e.engine.view.dom.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://cdn.test/cat.png");
    expect(img?.getAttribute("alt")).toBe("cat.png");
  });

  it("embeds a data URL by default", async () => {
    const e = mount(["basics", "images"]);

    await insertImageFiles(e, [png()]);

    expect(e.engine.view.dom.querySelector("img")?.getAttribute("src")).toMatch(
      /^data:image\/png;base64,/,
    );
  });

  it("rejects non-images, oversized files and failed uploads through onError", async () => {
    const onError = vi.fn();
    const upload = vi.fn(async () => {
      throw new Error("network down");
    });
    const e = mount(["basics", images({ upload, onError, maxFileSize: 4 })]);

    const count = await insertImageFiles(e, [
      new File(["x"], "notes.txt", { type: "text/plain" }),
      new File(["too large"], "big.png", { type: "image/png" }),
      png(),
    ]);

    expect(count).toBe(0);
    expect(onError.mock.calls.map(([error]) => (error as Error).message)).toEqual([
      '"notes.txt" is not an image.',
      '"big.png" is larger than the allowed size.',
      "network down",
    ]);
    expect(e.engine.view.dom.querySelector("img")).toBeNull();
  });

  it("throws when the feature is off", async () => {
    const e = mount(["basics"]);
    await expect(insertImageFiles(e, [png()])).rejects.toThrow(/not enabled/);
  });
});

describe("slash menu", () => {
  it("filters items, preferring word starts", () => {
    const titles = (query: string) =>
      filterSlashMenuItems(defaultSlashMenuItems, query).map((item) => item.title);

    expect(titles("")).toHaveLength(defaultSlashMenuItems.length);
    expect(titles("head")).toEqual(["Heading 1", "Heading 2", "Heading 3"]);
    expect(titles("todo")).toEqual(["Task list"]);
    expect(titles("list")).toEqual(["Bullet list", "Numbered list", "Task list"]);
    expect(titles("ote")).toEqual(["Quote"]);
    expect(titles("zzz")).toEqual([]);
  });

  it("opens on '/', follows the query and runs the selected item", () => {
    const e = mount(["basics", "slash-menu"]);
    const menu = getSlashMenu(e)!;
    expect(menu.store.getState().open).toBe(false);

    e.chain().insertContent("/").run();
    expect(menu.store.getState().open).toBe(true);
    // Table and image need their features, which are off here.
    expect(menu.store.getState().items.map((item) => item.id)).not.toContain("table");

    e.chain().insertContent("quo").run();
    const state = menu.store.getState();
    expect(state.query).toBe("quo");
    expect(state.items.map((item) => item.id)).toEqual(["blockquote"]);

    menu.select(state.items[0]!);
    expect(e.getHTML()).toMatch(/^<blockquote><p><\/p><\/blockquote>/);
    expect(menu.store.getState().open).toBe(false);
  });

  it("moves the selection with the arrow keys and runs it with Enter", () => {
    const e = mount(["basics", "slash-menu"]);
    const menu = getSlashMenu(e)!;
    const press = (key: string) =>
      e.engine.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

    e.chain().insertContent("/").run();
    press("ArrowDown");
    expect(menu.store.getState().selectedIndex).toBe(1);
    press("ArrowUp");
    press("ArrowUp");
    expect(menu.store.getState().selectedIndex).toBe(menu.store.getState().items.length - 1);

    menu.setSelectedIndex(1);
    press("Enter");
    expect(e.getHTML()).toMatch(/^<h1><\/h1>/);
  });

  it("closes on Escape and offers table and image when enabled", () => {
    const e = mount(["basics", "tables", "images", slashMenu()]);
    const menu = getSlashMenu(e)!;

    e.chain().insertContent("/").run();
    expect(menu.store.getState().items.map((item) => item.id)).toEqual(
      expect.arrayContaining(["table", "image"]),
    );

    e.engine.view.dom.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(menu.store.getState().open).toBe(false);
  });

  it("is not available without the feature", () => {
    expect(getSlashMenu(mount(["basics"]))).toBeNull();
  });
});
