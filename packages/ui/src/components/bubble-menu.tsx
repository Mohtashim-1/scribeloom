import type { EditorUIProps } from "@openedit/react";
import { useEditorState } from "@openedit/react";
import { Link as LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { actions } from "../actions";
import { useAnchoredPosition, useFocusWithin, useIsSelecting } from "../hooks";
import { cx } from "../lib/cx";
import { ActionButton, Bar, BarButton, BarSeparator, panelClass } from "./bar";
import { LinkEditor } from "./link-editor";

/**
 * The floating menu that appears over a text selection: inline formatting
 * and link editing.
 */
export function BubbleMenu({ editor }: EditorUIProps) {
  const [mode, setMode] = useState<"format" | "link">("format");
  const focus = useFocusWithin();
  const selecting = useIsSelecting(editor);
  const state = useEditorState(editor, (e) => ({
    hasSelection:
      e.isEditable && !e.isSelectionEmpty && !e.selectedNodeName && !e.isActive("codeBlock"),
    focused: e.isFocused,
    inTable: e.isActive("table"),
    link: e.isActive("link"),
    canLink: e.has("link"),
  }));
  const hasSelection = state?.hasSelection ?? false;
  const open = hasSelection && !selecting && (state?.focused || focus.focused || mode === "link");

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

  if (!open) return null;
  return (
    <div ref={position.setFloating} style={position.style} className="z-50" {...focus.props}>
      {mode === "link" ? (
        <div className={cx(panelClass, "p-1")}>
          <LinkEditor editor={editor} onDone={() => setMode("format")} />
        </div>
      ) : (
        <Bar aria-label="Selection formatting" className={cx(panelClass, "p-1")}>
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
        </Bar>
      )}
    </div>
  );
}
