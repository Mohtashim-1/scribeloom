import { pickImageFiles } from "@openedit/extensions/images";
import type { EditorUIProps } from "@openedit/react";
import { useEditorState } from "@openedit/react";
import { ImageUp, Trash2 } from "lucide-react";
import { useAnchoredPosition, useEditorFocus, useFocusWithin } from "../hooks";
import { cx } from "../lib/cx";
import { Bar, BarButton, panelClass } from "./bar";

/**
 * Floating controls for the selected image: replace it or delete it. Drag
 * the corner handles to resize. Needs the `images` feature.
 */
export function ImageMenu({ editor }: EditorUIProps) {
  const focus = useFocusWithin();
  const state = useEditorState(editor, (e) => ({
    selected: e.isEditable && e.selectedNodeName === "image",
  }));
  const editorFocused = useEditorFocus(editor);
  const open = !!state?.selected && (editorFocused || focus.focused);
  const position = useAnchoredPosition({
    editor,
    open,
    getRect: () => editor.getNodeRect("image"),
    placement: "top",
  });

  if (!open) return null;
  return (
    <Bar
      ref={position.setFloating}
      style={position.style}
      aria-label="Image"
      className={cx(panelClass, "p-1")}
      {...focus.props}
    >
      <BarButton label="Replace image" onClick={() => pickImageFiles(editor)}>
        <ImageUp size={16} aria-hidden="true" />
      </BarButton>
      <BarButton
        label="Delete image"
        onClick={() => editor.chain().focus().deleteSelection().run()}
      >
        <Trash2 size={16} aria-hidden="true" />
      </BarButton>
    </Bar>
  );
}
