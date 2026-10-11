import { Highlight } from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Placeholder, Selection } from "@tiptap/extensions";
import { StarterKit } from "@tiptap/starter-kit";
import { defineExtension, type OpenEditExtension } from "./define-extension";

/**
 * Options for the {@link basics} feature.
 */
export interface BasicsOptions {
  /** Text shown while the document is empty. */
  placeholder?: string;
  /**
   * Whether to include undo / redo history. Turn it off when another
   * extension provides history, as collaboration does.
   * @defaultValue `true`
   */
  history?: boolean;
}

/**
 * The baseline feature set: paragraphs, headings, bold, italic, underline,
 * strike, inline code, highlight, text alignment, links, blockquote,
 * horizontal rule, bullet, ordered and task lists, code blocks, undo / redo,
 * and a placeholder.
 */
export function basics(options: BasicsOptions = {}): OpenEditExtension {
  return defineExtension({
    name: "basics",
    engine: () => [
      StarterKit.configure({
        link: { openOnClick: false },
        ...(options.history === false ? { undoRedo: false as const } : {}),
      }),
      Placeholder.configure({ placeholder: options.placeholder ?? "" }),
      // Keeps the selection visible while focus is in a menu or popover.
      Selection.configure({ className: "oe-selection" }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
  });
}
