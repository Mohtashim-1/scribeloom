import type { OpenEditor } from "@openedit/core";
import { pickImageFiles } from "@openedit/extensions";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Redo2,
  SquareCode,
  Strikethrough,
  Table,
  TextQuote,
  Underline,
  Undo2,
  type LucideIcon,
} from "lucide-react";

/**
 * Something the user can do to the document from a button or a menu.
 */
export interface EditorAction {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Keyboard shortcut, with `Mod` for Ctrl / Cmd. Shown in tooltips. */
  shortcut?: string;
  /** Engine extension the action needs. The default UI hides it when missing. */
  requires?: string;
  /** Whether the action is "on" at the selection (e.g. the text is bold). */
  isActive?: (editor: OpenEditor) => boolean;
  /** Whether the action can run right now. Defaults to always. */
  isEnabled?: (editor: OpenEditor) => boolean;
  run: (editor: OpenEditor) => void;
}

const heading = (level: 1 | 2 | 3, icon: LucideIcon): EditorAction => ({
  id: `heading${level}`,
  label: `Heading ${level}`,
  icon,
  shortcut: `Mod+Alt+${level}`,
  isActive: (e) => e.isActive("heading", { level }),
  run: (e) => e.chain().focus().toggleHeading({ level }).run(),
});

const align = (value: "left" | "center" | "right" | "justify", icon: LucideIcon): EditorAction => ({
  id: `align${value[0]!.toUpperCase()}${value.slice(1)}`,
  label: value === "justify" ? "Justify" : `Align ${value}`,
  icon,
  requires: "textAlign",
  isActive: (e) => e.isActive({ textAlign: value }),
  run: (e) => e.chain().focus().setTextAlign(value).run(),
});

/**
 * The built-in actions, by id. Use them to compose your own toolbar:
 *
 * ```tsx
 * <ActionButton editor={editor} action={actions.bold} />
 * ```
 */
export const actions = {
  undo: {
    id: "undo",
    label: "Undo",
    icon: Undo2,
    shortcut: "Mod+Z",
    isEnabled: (e) => e.can().undo(),
    run: (e) => e.chain().focus().undo().run(),
  },
  redo: {
    id: "redo",
    label: "Redo",
    icon: Redo2,
    shortcut: "Mod+Shift+Z",
    isEnabled: (e) => e.can().redo(),
    run: (e) => e.chain().focus().redo().run(),
  },
  paragraph: {
    id: "paragraph",
    label: "Text",
    icon: Pilcrow,
    isActive: (e) => e.isActive("paragraph"),
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  heading1: heading(1, Heading1),
  heading2: heading(2, Heading2),
  heading3: heading(3, Heading3),
  bulletList: {
    id: "bulletList",
    label: "Bullet list",
    icon: List,
    shortcut: "Mod+Shift+8",
    isActive: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  orderedList: {
    id: "orderedList",
    label: "Numbered list",
    icon: ListOrdered,
    shortcut: "Mod+Shift+7",
    isActive: (e) => e.isActive("orderedList"),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  taskList: {
    id: "taskList",
    label: "Task list",
    icon: ListTodo,
    shortcut: "Mod+Shift+9",
    requires: "taskList",
    isActive: (e) => e.isActive("taskList"),
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  blockquote: {
    id: "blockquote",
    label: "Quote",
    icon: TextQuote,
    shortcut: "Mod+Shift+B",
    isActive: (e) => e.isActive("blockquote"),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  codeBlock: {
    id: "codeBlock",
    label: "Code block",
    icon: SquareCode,
    shortcut: "Mod+Alt+C",
    isActive: (e) => e.isActive("codeBlock"),
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  horizontalRule: {
    id: "horizontalRule",
    label: "Divider",
    icon: Minus,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  bold: {
    id: "bold",
    label: "Bold",
    icon: Bold,
    shortcut: "Mod+B",
    isActive: (e) => e.isActive("bold"),
    isEnabled: (e) => e.can().toggleBold(),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  italic: {
    id: "italic",
    label: "Italic",
    icon: Italic,
    shortcut: "Mod+I",
    isActive: (e) => e.isActive("italic"),
    isEnabled: (e) => e.can().toggleItalic(),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  underline: {
    id: "underline",
    label: "Underline",
    icon: Underline,
    shortcut: "Mod+U",
    isActive: (e) => e.isActive("underline"),
    isEnabled: (e) => e.can().toggleUnderline(),
    run: (e) => e.chain().focus().toggleUnderline().run(),
  },
  strike: {
    id: "strike",
    label: "Strikethrough",
    icon: Strikethrough,
    shortcut: "Mod+Shift+S",
    isActive: (e) => e.isActive("strike"),
    isEnabled: (e) => e.can().toggleStrike(),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  code: {
    id: "code",
    label: "Inline code",
    icon: Code,
    shortcut: "Mod+E",
    isActive: (e) => e.isActive("code"),
    isEnabled: (e) => e.can().toggleCode(),
    run: (e) => e.chain().focus().toggleCode().run(),
  },
  highlight: {
    id: "highlight",
    label: "Highlight",
    icon: Highlighter,
    shortcut: "Mod+Shift+H",
    requires: "highlight",
    isActive: (e) => e.isActive("highlight"),
    isEnabled: (e) => e.can().toggleHighlight(),
    run: (e) => e.chain().focus().toggleHighlight().run(),
  },
  alignLeft: align("left", AlignLeft),
  alignCenter: align("center", AlignCenter),
  alignRight: align("right", AlignRight),
  alignJustify: align("justify", AlignJustify),
  image: {
    id: "image",
    label: "Image",
    icon: ImagePlus,
    requires: "image",
    run: (e) => pickImageFiles(e),
  },
  table: {
    id: "table",
    label: "Table",
    icon: Table,
    requires: "table",
    isEnabled: (e) => !e.isActive("table"),
    run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
} satisfies Record<string, EditorAction>;

/** Id of a built-in action. */
export type ActionId = keyof typeof actions;
