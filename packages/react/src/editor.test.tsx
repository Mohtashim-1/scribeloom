import type { OpenEditor } from "@openedit/core";
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Editor,
  EditorContent,
  useEditor,
  useEditorContext,
  useEditorState,
  type EditorUIProps,
} from "./index";

afterEach(cleanup);

describe("<Editor />", () => {
  it("renders the initial content", () => {
    const { container } = render(<Editor content="<p>Hello world</p>" className="my-editor" />);

    expect(container.querySelector(".my-editor [contenteditable='true']")?.textContent).toBe(
      "Hello world",
    );
  });

  it("works in StrictMode", () => {
    const { container } = render(
      <StrictMode>
        <Editor content="<p>Strict</p>" />
      </StrictMode>,
    );

    expect(container.querySelectorAll("[contenteditable]")).toHaveLength(1);
    expect(container.textContent).toBe("Strict");
  });

  it("follows the editable prop", () => {
    const { container, rerender } = render(<Editor content="<p>Hi</p>" editable={false} />);
    expect(container.querySelector("[contenteditable]")?.getAttribute("contenteditable")).toBe(
      "false",
    );

    rerender(<Editor content="<p>Hi</p>" editable />);
    expect(container.querySelector("[contenteditable]")?.getAttribute("contenteditable")).toBe(
      "true",
    );
  });

  it("calls the latest onUpdate", () => {
    let instance: OpenEditor | null = null;
    const first = vi.fn();
    const second = vi.fn((editor: OpenEditor) => {
      instance = editor;
    });
    function Harness({ onUpdate }: { onUpdate: (editor: OpenEditor) => void }) {
      const editor = useEditor({ onUpdate });
      instance = editor;
      return <EditorContent editor={editor} />;
    }
    const { rerender } = render(<Harness onUpdate={first} />);
    rerender(<Harness onUpdate={second} />);

    act(() => instance?.setContent("<p>Changed</p>"));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("renders an editor passed in from outside", () => {
    const { result } = renderHook(() => useEditor({ content: "<p>External</p>" }));

    render(<Editor editor={result.current} />);

    expect(screen.getByText("External")).toBeTruthy();
  });
});

describe("ui slots and theme", () => {
  function Toolbar({ editor }: EditorUIProps) {
    const { resolvedTheme, setTheme } = useEditorContext();
    return (
      <div role="toolbar">
        <button onClick={() => editor.chain().selectAll().toggleBold().run()}>Bold</button>
        <button onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>Theme</button>
      </div>
    );
  }

  it("renders nothing extra without ui", () => {
    const { container } = render(<Editor content="<p>Plain</p>" />);

    expect(container.querySelector(".oe-root")?.children).toHaveLength(1);
    expect(container.querySelector(".oe-body")?.children).toHaveLength(1);
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("renders a slot component with the editor", () => {
    const { container } = render(<Editor content="<p>Hello</p>" ui={{ Toolbar }} />);

    act(() => screen.getByText("Bold").click());

    expect(container.querySelector("strong")?.textContent).toBe("Hello");
  });

  it("applies the theme and lets the ui change it", () => {
    const onThemeChange = vi.fn();
    const { container } = render(
      <Editor theme="dark" onThemeChange={onThemeChange} ui={{ Toolbar }} />,
    );
    const root = container.querySelector(".oe-root");
    expect(root?.getAttribute("data-oe-theme")).toBe("dark");

    act(() => screen.getByText("Theme").click());

    expect(root?.getAttribute("data-oe-theme")).toBe("light");
    expect(onThemeChange).toHaveBeenCalledWith("light");
  });

  it("defaults to the light theme when the system has no preference", () => {
    const { container } = render(<Editor />);
    expect(container.querySelector(".oe-root")?.getAttribute("data-oe-theme")).toBe("light");
  });
});

describe("useEditor", () => {
  it("creates the editor after mount and destroys it on unmount", () => {
    const { result, unmount } = renderHook(() => useEditor({ content: "<p>Hook</p>" }));
    const editor = result.current;

    expect(editor?.getText()).toBe("Hook");

    unmount();
    expect(editor?.isDestroyed).toBe(true);
  });
});

describe("useEditorState", () => {
  it("updates when the editor is mounted, without waiting for a transaction", () => {
    function Harness() {
      const editor = useEditor({ content: "<p>Hello</p>" });
      const mounted = useEditorState(editor, (e) => e.isMounted);
      return (
        <>
          <output>{mounted ? "mounted" : "detached"}</output>
          <EditorContent editor={editor} />
        </>
      );
    }
    render(<Harness />);

    expect(screen.getByRole("status").textContent).toBe("mounted");
  });

  it("re-renders only when the selected value changes", () => {
    let renders = 0;
    let instance: OpenEditor | null = null;
    function Harness() {
      const editor = useEditor({ content: "<p>Hello</p>" });
      instance = editor;
      const state = useEditorState(editor, (e) => ({ bold: e.isActive("bold") }));
      renders++;
      return (
        <>
          <output>{state?.bold ? "bold" : "plain"}</output>
          <EditorContent editor={editor} />
        </>
      );
    }
    render(<Harness />);
    expect(screen.getByRole("status").textContent).toBe("plain");

    act(() => instance?.chain().selectAll().run());
    const before = renders;
    act(() => instance?.chain().setTextSelection(2).run());
    expect(renders).toBe(before);

    act(() => instance?.chain().selectAll().toggleBold().run());
    expect(screen.getByRole("status").textContent).toBe("bold");
  });
});
