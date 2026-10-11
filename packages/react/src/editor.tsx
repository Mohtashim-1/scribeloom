import type { EditorOptions, OpenEditor } from "@openedit/core";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { EditorContext, type EditorContextValue, type EditorTheme } from "./context";
import { EditorContent } from "./editor-content";
import { useEditor } from "./use-editor";
import { useTheme } from "./use-theme";

/** Props every UI slot component receives. */
export interface EditorUIProps {
  editor: OpenEditor;
}

/**
 * The replaceable parts of the editor UI. Every slot is optional; leave one
 * out to render nothing there.
 *
 * `@openedit/ui` exports a ready-made set as `DefaultUI`.
 */
export interface EditorUI {
  /** Fixed toolbar above the document. */
  Toolbar?: ComponentType<EditorUIProps>;
  /** Floating menu for the text selection. */
  BubbleMenu?: ComponentType<EditorUIProps>;
  /** The `/` command menu. */
  SlashMenu?: ComponentType<EditorUIProps>;
  /** Controls for the table around the cursor. */
  TableMenu?: ComponentType<EditorUIProps>;
  /** Controls for the selected image. */
  ImageMenu?: ComponentType<EditorUIProps>;
}

/**
 * Props for {@link Editor}.
 */
export interface EditorProps extends Omit<EditorOptions, "element"> {
  /**
   * An existing editor to render. When set, the other editor options are
   * ignored and you are responsible for destroying the editor.
   */
  editor?: OpenEditor | null;
  /**
   * UI components to render around the document. Without it the editor is
   * headless: just the editable area.
   *
   * @example
   * ```tsx
   * <Editor ui={{ ...DefaultUI, Toolbar: MyToolbar }} />
   * ```
   */
  ui?: EditorUI;
  /** Colour theme. @defaultValue `"system"` */
  theme?: EditorTheme;
  /** Called when the UI changes the theme, e.g. through a theme toggle. */
  onThemeChange?: (theme: EditorTheme) => void;
  /** Class name for the editor's root element. */
  className?: string;
  /** Rendered inside the root, after the document. Has access to `useEditorContext()`. */
  children?: ReactNode;
}

/**
 * The all-in-one editor component.
 *
 * `features`, `content`, `placeholder` and `autofocus` are read once, when the
 * editor is created. `editable`, `onUpdate`, `ui` and `theme` can change
 * between renders.
 *
 * @example
 * ```tsx
 * <Editor content="<p>Hello</p>" onUpdate={(editor) => save(editor.getJSON())} />
 * ```
 */
export function Editor({ editor, ...props }: EditorProps) {
  if (editor !== undefined) {
    return <EditorShell {...props} editor={editor} />;
  }
  return <OwnedEditor {...props} />;
}

function OwnedEditor({
  ui,
  theme,
  onThemeChange,
  className,
  children,
  ...options
}: Omit<EditorProps, "editor">) {
  const editor = useEditor(options);
  return (
    <EditorShell
      editor={editor}
      ui={ui}
      theme={theme}
      onThemeChange={onThemeChange}
      className={className}
    >
      {children}
    </EditorShell>
  );
}

interface EditorShellProps {
  editor: OpenEditor | null;
  ui?: EditorUI;
  theme?: EditorTheme;
  onThemeChange?: (theme: EditorTheme) => void;
  className?: string;
  children?: ReactNode;
}

function EditorShell({ editor, ui = {}, className, children, ...themeProps }: EditorShellProps) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const { theme, resolvedTheme, setTheme } = useTheme(themeProps.theme, themeProps.onThemeChange);
  const context = useMemo<EditorContextValue>(
    () => ({ editor, root, theme, resolvedTheme, setTheme }),
    [editor, root, theme, resolvedTheme, setTheme],
  );
  const { Toolbar, BubbleMenu, SlashMenu, TableMenu, ImageMenu } = ui;

  return (
    <EditorContext.Provider value={context}>
      <div
        ref={setRoot}
        className={className ? `oe-root ${className}` : "oe-root"}
        data-oe-theme={resolvedTheme}
      >
        {editor && Toolbar && <Toolbar editor={editor} />}
        <EditorContent editor={editor} className="oe-content" />
        {editor && BubbleMenu && <BubbleMenu editor={editor} />}
        {editor && SlashMenu && <SlashMenu editor={editor} />}
        {editor && TableMenu && <TableMenu editor={editor} />}
        {editor && ImageMenu && <ImageMenu editor={editor} />}
        {children}
      </div>
    </EditorContext.Provider>
  );
}
