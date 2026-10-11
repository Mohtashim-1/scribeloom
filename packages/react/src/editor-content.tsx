import type { OpenEditor } from "@openedit/core";
import { useEffect, useRef, type HTMLAttributes } from "react";

/**
 * Props for {@link EditorContent}.
 */
export interface EditorContentProps extends HTMLAttributes<HTMLDivElement> {
  /** The editor to render. Renders an empty container while `null`. */
  editor: OpenEditor | null;
}

/**
 * Renders an editor's editable area. Use it with `useEditor()` when you need
 * the editor instance elsewhere, for example in a toolbar.
 */
export function EditorContent({ editor, ...props }: EditorContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!editor || !element || editor.isDestroyed) return;
    editor.mount(element);
    return () => {
      if (!editor.isDestroyed) editor.unmount();
    };
  }, [editor]);

  return <div data-openedit-content="" {...props} ref={ref} />;
}
