import type { OpenEditor } from "@openedit/core";
import { createContext, useContext } from "react";

/** Theme setting. `"system"` follows the operating system. */
export type EditorTheme = "light" | "dark" | "system";

/**
 * What `<Editor>` shares with the UI components rendered inside it.
 */
export interface EditorContextValue {
  editor: OpenEditor | null;
  /**
   * The editor's root element. Render floating UI into it (not into
   * `document.body`) so it inherits the theme tokens.
   */
  root: HTMLElement | null;
  /** The theme setting. */
  theme: EditorTheme;
  /** The theme in effect, with `"system"` resolved. */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: EditorTheme) => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

/**
 * Reads the surrounding `<Editor>`.
 *
 * @throws If used outside of an `<Editor>`.
 */
export function useEditorContext(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error("useEditorContext must be used inside <Editor>.");
  }
  return context;
}
