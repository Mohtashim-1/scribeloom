import type { EditorUIProps } from "@openedit/react";
import { Heading, List } from "lucide-react";
import { actions } from "../actions";
import { ActionMenu } from "./action-menu";
import { ActionButton, Bar, BarSeparator } from "./bar";
import { LinkButton } from "./link-editor";
import { Presence } from "./presence";
import { ThemeToggle } from "./theme-toggle";

/**
 * The default fixed toolbar: history, block type, inline formatting, link,
 * alignment, inserts, who is present (with collaboration on), and the theme
 * toggle.
 *
 * To change it, build your own from the same parts ({@link Bar},
 * {@link ActionButton}, {@link ActionMenu}, {@link LinkButton}, ...) and pass
 * it as the `Toolbar` slot.
 */
export function Toolbar({ editor }: EditorUIProps) {
  return (
    <Bar
      aria-label="Formatting"
      className="sticky top-0 z-10 shrink-0 overflow-x-auto border-b border-oe-border bg-oe-bg px-2 py-1.5"
    >
      <span className="flex-1" />
      <ActionButton editor={editor} action={actions.undo} />
      <ActionButton editor={editor} action={actions.redo} />
      <BarSeparator />
      <ActionMenu
        editor={editor}
        label="Text style"
        icon={Heading}
        actions={[actions.paragraph, actions.heading1, actions.heading2, actions.heading3]}
      />
      <ActionMenu
        editor={editor}
        label="List"
        icon={List}
        actions={[actions.bulletList, actions.orderedList, actions.taskList]}
      />
      <ActionButton editor={editor} action={actions.blockquote} />
      <ActionButton editor={editor} action={actions.codeBlock} />
      <BarSeparator />
      <ActionButton editor={editor} action={actions.bold} />
      <ActionButton editor={editor} action={actions.italic} />
      <ActionButton editor={editor} action={actions.strike} />
      <ActionButton editor={editor} action={actions.code} />
      <ActionButton editor={editor} action={actions.underline} />
      <ActionButton editor={editor} action={actions.highlight} />
      <LinkButton editor={editor} />
      <BarSeparator />
      <ActionButton editor={editor} action={actions.alignLeft} />
      <ActionButton editor={editor} action={actions.alignCenter} />
      <ActionButton editor={editor} action={actions.alignRight} />
      <ActionButton editor={editor} action={actions.alignJustify} />
      <BarSeparator />
      <ActionButton editor={editor} action={actions.image} />
      <ActionButton editor={editor} action={actions.table} />
      <span className="flex flex-1 items-center justify-end gap-2 pl-2">
        <Presence editor={editor} />
        <ThemeToggle />
      </span>
    </Bar>
  );
}
