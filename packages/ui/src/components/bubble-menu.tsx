import type { EditorUIProps } from "@openedit/react";
import { useEditorState } from "@openedit/react";
import { Link as LinkIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { actions } from "../actions";
import {
  useAI,
  useAnchoredPosition,
  useEditorFocus,
  useFocusWithin,
  useIsSelecting,
  useToolbarShortcut,
} from "../hooks";
import { cx } from "../lib/cx";
import { AIMenu } from "./ai";
import { ActionButton, Bar, BarButton, BarSeparator, panelClass } from "./bar";
import { LinkEditor } from "./link-editor";
import { CommentButton } from "./review-buttons";

/**
 * The floating menu that appears over a text selection: inline formatting
 * and link editing. Alt+F10 moves focus into it from the document.
 */
export function BubbleMenu({ editor }: EditorUIProps) {
  const [mode, setMode] = useState<"format" | "link">("format");
  const focus = useFocusWithin();
  const selecting = useIsSelecting(editor);
  const state = useEditorState(editor, (e) => ({
    hasSelection:
      e.isEditable && !e.isSelectionEmpty && !e.selectedNodeName && !e.isActive("codeBlock"),
    inTable: e.isActive("table"),
    link: e.isActive("link"),
    canLink: e.has("link"),
  }));
  // While AI is working on the selection, its own panel takes over.
  const { state: aiState } = useAI(editor);
  const hasSelection = (state?.hasSelection ?? false) && aiState.status === "idle";
  const editorFocused = useEditorFocus(editor);
  const open = hasSelection && !selecting && (editorFocused || focus.focused || mode === "link");

  // Leaving the selection ends link editing.
  useEffect(() => {
    if (!hasSelection) setMode("format");
  }, [hasSelection]);

  const position = useAnchoredPosition({
    editor,
    open,
    getRect: () => editor.getSelectionRect(),
    // The table menu sits above the table, so stay out of its way.
    placement: state?.inTable ? "bottom" : "top",
  });

  const container = useRef<HTMLDivElement | null>(null);
  // Alt+F10 goes to this menu while it is showing, ahead of the fixed toolbar.
  useToolbarShortcut(editor, () => container.current, { enabled: open, priority: true });

  if (!open) return null;
  return (
    <div
      ref={(node) => {
        container.current = node;
        position.setFloating(node);
      }}
      style={position.style}
      className="z-50"
      data-oe-priority=""
      {...focus.props}
    >
      {mode === "link" ? (
        <div className={cx(panelClass, "p-1")}>
          <LinkEditor editor={editor} onDone={() => setMode("format")} />
        </div>
      ) : (
        <Bar aria-label="Selection formatting" className={cx(panelClass, "p-1")}>
          <AIMenu editor={editor} />
          {editor.has("ai") && <BarSeparator />}
          <ActionButton editor={editor} action={actions.bold} />
          <ActionButton editor={editor} action={actions.italic} />
          <ActionButton editor={editor} action={actions.underline} />
          <ActionButton editor={editor} action={actions.strike} />
          <ActionButton editor={editor} action={actions.code} />
          <ActionButton editor={editor} action={actions.highlight} />
          {state?.canLink && (
            <>
              <BarSeparator />
              <BarButton label="Link" active={state.link} onClick={() => setMode("link")}>
                <LinkIcon size={16} aria-hidden="true" />
              </BarButton>
            </>
          )}
          <CommentButton editor={editor} />
        </Bar>
      )}
    </div>
  );
}
