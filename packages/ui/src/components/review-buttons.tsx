import type { OpenEditor } from "@openedit/core";
import { useEditorState } from "@openedit/react";
import { MessageSquarePlus, PencilLine } from "lucide-react";
import { useComments, useSuggestions } from "../hooks";
import { BarButton } from "./bar";

/**
 * Bar button that starts a comment on the selection. The composer appears in
 * the sidebar. Renders nothing unless the `comments` feature is on.
 */
export function CommentButton({ editor }: { editor: OpenEditor }) {
  const { comments } = useComments(editor);
  const enabled = useEditorState(editor, () => comments?.canComment() ?? false) ?? false;
  if (!comments) return null;
  return (
    <BarButton label="Comment" disabled={!enabled} onClick={() => comments.setDrafting(true)}>
      <MessageSquarePlus size={16} aria-hidden="true" />
    </BarButton>
  );
}

/**
 * Bar button that switches suggesting mode on and off. Renders nothing
 * unless the `suggestions` feature is on.
 */
export function SuggestingToggle({ editor }: { editor: OpenEditor }) {
  const { suggestions, state } = useSuggestions(editor);
  const editable = useEditorState(editor, (e) => e.isEditable) ?? false;
  if (!suggestions) return null;
  return (
    <BarButton
      label={state.enabled ? "Suggesting: edits become suggestions" : "Suggest edits"}
      active={state.enabled}
      disabled={!editable}
      onClick={() => suggestions.setEnabled(!state.enabled)}
    >
      <PencilLine size={16} aria-hidden="true" />
    </BarButton>
  );
}
