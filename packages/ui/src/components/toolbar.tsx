import type { EditorUIProps } from "@openedit/react";
import { useRef, type ReactNode } from "react";
import { Heading, List } from "lucide-react";
import { actions } from "../actions";
import { useToolbarShortcut } from "../hooks";
import { ActionMenu } from "./action-menu";
import { ActionButton, Bar, BarSeparator } from "./bar";
import { LinkButton } from "./link-editor";
import { Presence } from "./presence";
import { SuggestingToggle } from "./review-buttons";
import { ThemeToggle } from "./theme-toggle";

/**
 * Props for {@link Toolbar}.
 */
export interface ToolbarProps extends EditorUIProps {
  /**
   * Extra buttons, shown at the right before the theme toggle. Lets you add
   * to the default toolbar without rebuilding it:
   *
   * ```tsx
   * ui={{ Toolbar: (props) => <Toolbar {...props}><MyButton /></Toolbar> }}
   * ```
   */
  children?: ReactNode;
}

/**
 * The default fixed toolbar: history, block type, inline formatting, link,
 * alignment, inserts, who is present (with collaboration on), and the theme
 * toggle.
 *
 * Keyboard: Alt+F10 in the document moves focus here, the arrow keys move
 * between buttons, and Escape goes back.
 *
 * To change it, build your own from the same parts ({@link Bar},
 * {@link ActionButton}, {@link ActionMenu}, {@link LinkButton}, ...) and pass
 * it as the `Toolbar` slot.
 */
export function Toolbar({ editor, children }: ToolbarProps) {
  const bar = useRef<HTMLDivElement>(null);
  // Alt+F10 in the document jumps here.
  useToolbarShortcut(editor, () => bar.current);
  return (
    <Bar
      ref={bar}
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
        {children}
        <SuggestingToggle editor={editor} />
        <Presence editor={editor} />
        <ThemeToggle />
      </span>
    </Bar>
  );
}
