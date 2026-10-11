import type { OpenEditor } from "@openedit/core";
import "@openedit/extensions/collab";
import { Editor, useEditorContext, type EditorUIProps } from "@openedit/react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  ActionButton,
  actions,
  Bar,
  DefaultUI,
  formatShortcut,
  LinkEditor,
  normalizeUrl,
  RichTextEditor,
} from "./index";

beforeAll(() => {
  // jsdom has no layout, so it lacks the observers floating elements rely on.
  Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect ??= () => new DOMRect();
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(cleanup);

/** Renders into the test and hands back the live editor. */
function setup(ui: React.ReactElement<{ children?: React.ReactNode }>) {
  let editor: OpenEditor | null = null;
  function Probe() {
    editor = useEditorContext().editor;
    return null;
  }
  const result = render({ ...ui, props: { ...ui.props, children: <Probe /> } });
  return { ...result, editor: editor as unknown as OpenEditor };
}

describe("normalizeUrl", () => {
  it.each([
    ["example.com", "https://example.com"],
    ["  example.com/path?q=1  ", "https://example.com/path?q=1"],
    ["http://example.com", "http://example.com"],
    ["HTTPS://Example.com", "HTTPS://Example.com"],
    ["localhost:3000/docs", "https://localhost:3000/docs"],
    ["someone@example.com", "mailto:someone@example.com"],
    ["mailto:someone@example.com", "mailto:someone@example.com"],
    ["tel:+123456", "tel:+123456"],
    ["/docs/intro", "/docs/intro"],
    ["#section", "#section"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "java\tscript:alert(1)",
    "two words",
  ])("rejects %j", (input) => {
    expect(normalizeUrl(input)).toBeNull();
  });
});

describe("formatShortcut", () => {
  it("uses symbols on Apple devices and names elsewhere", () => {
    expect(formatShortcut("Mod+Shift+S", true)).toBe("⌘⇧S");
    expect(formatShortcut("Mod+Shift+S", false)).toBe("Ctrl+Shift+S");
  });
});

describe("<RichTextEditor />", () => {
  it("renders the default toolbar and formats with it", () => {
    const { editor } = setup(<RichTextEditor content="<p>Hello</p>" />);
    const toolbar = screen.getByRole("toolbar", { name: "Formatting" });
    const bold = within(toolbar).getByRole("button", { name: "Bold" });
    expect(bold.getAttribute("aria-pressed")).toBe("false");

    act(() => {
      editor.chain().selectAll().run();
    });
    fireEvent.click(bold);

    expect(editor.getHTML()).toBe("<p><strong>Hello</strong></p>");
    expect(bold.getAttribute("aria-pressed")).toBe("true");
  });

  it("offers table and image buttons, and disables undo until there is history", () => {
    const { editor } = setup(<RichTextEditor content="<p>Hello</p>" />);
    const toolbar = within(screen.getByRole("toolbar", { name: "Formatting" }));
    expect(toolbar.getByRole("button", { name: "Image" })).toBeTruthy();
    expect((toolbar.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fireEvent.click(toolbar.getByRole("button", { name: "Table" }));

    expect(editor.getHTML()).toContain("<table");
    expect((toolbar.getByRole("button", { name: "Undo" }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("hides controls for features that are off", () => {
    setup(<Editor features={["basics"]} ui={DefaultUI} />);
    const toolbar = within(screen.getByRole("toolbar", { name: "Formatting" }));

    expect(toolbar.queryByRole("button", { name: "Table" })).toBeNull();
    expect(toolbar.queryByRole("button", { name: "Image" })).toBeNull();
    expect(toolbar.getByRole("button", { name: "Bold" })).toBeTruthy();
  });

  it("disables formatting when read-only", () => {
    setup(<RichTextEditor content="<p>Hello</p>" editable={false} />);

    const bold = screen.getByRole("button", { name: "Bold" }) as HTMLButtonElement;
    expect(bold.disabled).toBe(true);
  });

  it("switches theme from the toolbar", () => {
    const { container } = setup(<RichTextEditor theme="light" />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(container.querySelector(".oe-root")?.getAttribute("data-oe-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeTruthy();
  });
});

describe("customization level 2: slots", () => {
  function MyToolbar({ editor }: EditorUIProps) {
    return (
      <Bar aria-label="Mine">
        <ActionButton editor={editor} action={actions.italic} />
      </Bar>
    );
  }

  it("replaces the toolbar and keeps the other slots", async () => {
    const { editor } = setup(<RichTextEditor content="<p>Hello</p>" ui={{ Toolbar: MyToolbar }} />);

    expect(screen.queryByRole("toolbar", { name: "Formatting" })).toBeNull();
    const mine = within(screen.getByRole("toolbar", { name: "Mine" }));
    expect(mine.getAllByRole("button")).toHaveLength(1);

    act(() => {
      editor.chain().insertContent("/").run();
    });
    // Floating elements stay hidden until they are positioned, a tick later.
    expect(await screen.findByRole("listbox", { name: "Insert block" })).toBeTruthy();
  });

  it("removes a slot set to undefined", () => {
    setup(<RichTextEditor ui={{ Toolbar: undefined }} />);
    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});

describe("<SlashMenu />", () => {
  it("lists matching items and runs the clicked one", async () => {
    const { editor } = setup(<RichTextEditor />);

    act(() => {
      editor.chain().insertContent("/head").run();
    });
    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "Heading 1Large section heading",
      "Heading 2Medium section heading",
      "Heading 3Small section heading",
    ]);
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");

    fireEvent.click(options[1]!);

    expect(editor.getHTML()).toMatch(/^<h2><\/h2>/);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("says so when nothing matches", () => {
    const { editor } = setup(<RichTextEditor />);

    act(() => {
      editor.chain().insertContent("/zzzz").run();
    });

    expect(screen.getByText("No results")).toBeTruthy();
  });
});

describe("<Presence />", () => {
  it("shows the local user when collaboration is on, and nothing otherwise", async () => {
    setup(
      <RichTextEditor
        features={["basics", "collab"]}
        collab={{
          room: "ui-test",
          user: { name: "Ada Lovelace", color: "#3e63dd" },
          offline: false,
        }}
      />,
    );

    const group = await screen.findByRole("group", {
      name: "In this document: Ada Lovelace (you)",
    });
    expect(within(group).getByText("AL")).toBeTruthy();
    // No server configured, so there is no connection state to report.
    expect(within(group).queryByRole("status")).toBeNull();

    cleanup();
    setup(<RichTextEditor />);
    expect(screen.queryByRole("group")).toBeNull();
  });
});

describe("<CommentsSidebar />", () => {
  it("stays out of the way until there is something to show", () => {
    setup(<RichTextEditor content="<p>Hello world</p>" />);
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("adds a comment on the selection, then replies and resolves", async () => {
    const { editor } = setup(
      <RichTextEditor content="<p>Hello world</p>" comments={{ user: { name: "Ada" } }} />,
    );
    act(() => {
      editor.chain().setTextSelection({ from: 7, to: 12 }).run();
    });
    const api = (await import("@openedit/extensions")).getComments(editor)!;

    act(() => api.setDrafting(true));
    const sidebar = within(screen.getByRole("complementary", { name: "Comments and suggestions" }));
    fireEvent.change(sidebar.getByLabelText("Comment"), { target: { value: "Which world?" } });
    fireEvent.click(sidebar.getByRole("button", { name: "Comment" }));

    const thread = within(sidebar.getByRole("article", { name: "Comment on world" }));
    expect(thread.getByText("Which world?")).toBeTruthy();
    expect(thread.getByText("Ada")).toBeTruthy();

    fireEvent.change(thread.getByLabelText("Reply"), { target: { value: "This one" } });
    fireEvent.click(thread.getByRole("button", { name: "Reply" }));
    expect(thread.getByText("This one")).toBeTruthy();

    fireEvent.click(thread.getByRole("button", { name: /Resolve/ }));
    expect(sidebar.queryByRole("article")).toBeNull();
    fireEvent.click(sidebar.getByRole("button", { name: "Show resolved (1)" }));
    expect(sidebar.getByRole("button", { name: /Reopen/ })).toBeTruthy();
  });

  it("lists suggestions made in suggesting mode and accepts them", () => {
    const { editor } = setup(
      <RichTextEditor content="<p>Hello world</p>" suggestions={{ user: { name: "Ada" } }} />,
    );
    const toggle = screen.getByRole("button", { name: "Suggest edits" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");

    act(() => {
      editor.chain().insertContentAt({ from: 7, to: 12 }, "there").run();
    });
    const sidebar = within(screen.getByRole("complementary"));
    expect(sidebar.getByRole("article", { name: "Suggestion" }).textContent).toContain(
      "Replace world with there",
    );

    fireEvent.click(sidebar.getByRole("button", { name: "Accept suggestion" }));

    expect(editor.getHTML()).toBe("<p>Hello there</p>");
    expect(screen.queryByRole("complementary")).toBeNull();
  });
});

describe("AI", () => {
  const provider = {
    async *stream() {
      yield "Hi ";
      yield "there";
    },
  };

  it("is not offered unless a provider is configured", () => {
    setup(<RichTextEditor content="<p>Hello world</p>" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("previews the result and applies it on Accept", async () => {
    const { editor } = setup(<RichTextEditor content="<p>Hello world</p>" ai={{ provider }} />);
    const { getAI } = await import("@openedit/ai");
    act(() => {
      editor.chain().setTextSelection({ from: 1, to: 12 }).run();
    });

    act(() => getAI(editor)!.run("improve"));
    const panel = within(await screen.findByRole("dialog", { name: "AI: Improve writing" }));
    const accept = await panel.findByRole("button", { name: "Accept" });
    expect(editor.getHTML()).toBe("<p>Hello world</p>");

    fireEvent.click(accept);

    expect(editor.getHTML()).toBe("<p>Hi there</p>");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks for an instruction, and Escape discards", async () => {
    const { editor } = setup(<RichTextEditor content="<p>Hello world</p>" ai={{ provider }} />);
    const { getAI } = await import("@openedit/ai");

    act(() => getAI(editor)!.run("custom"));
    const dialog = await screen.findByRole("dialog", { name: "AI: Ask AI" });
    const input = within(dialog).getByLabelText("Instruction");
    expect(
      (within(dialog).getByRole("button", { name: "Send" }) as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.change(input, { target: { value: "Greet them" } });
    fireEvent.submit(input);
    await within(dialog).findByRole("button", { name: "Accept" });
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(editor.getHTML()).toBe("<p>Hello world</p>");
  });
});

describe("<LinkEditor />", () => {
  function Harness() {
    const { editor } = useEditorContext();
    return editor ? <LinkEditor editor={editor} autoFocus={false} /> : null;
  }

  it("rejects unsafe URLs and applies cleaned-up ones", () => {
    let editor: OpenEditor | null = null;
    function Probe() {
      editor = useEditorContext().editor;
      return <Harness />;
    }
    render(
      <Editor content="<p>Hello</p>">
        <Probe />
      </Editor>,
    );
    const instance = editor as unknown as OpenEditor;
    act(() => {
      instance.chain().selectAll().run();
    });
    const input = screen.getByLabelText("Link URL") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "javascript:alert(1)" } });
    fireEvent.submit(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(instance.getHTML()).toBe("<p>Hello</p>");

    fireEvent.change(input, { target: { value: "example.com" } });
    fireEvent.submit(input);
    expect(instance.getHTML()).toContain('href="https://example.com"');
  });
});
