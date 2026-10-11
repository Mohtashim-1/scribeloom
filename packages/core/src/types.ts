import type { JSONContent } from "@tiptap/core";
import type { OpenEditExtension } from "./define-extension";
import type { OpenEditor } from "./editor";
import type { FeatureName } from "./features";

/** A document as JSON. */
export type DocumentJSON = JSONContent;

/** Content accepted by the editor: an HTML string or a JSON document. */
export type EditorContent = string | DocumentJSON;

/**
 * Options for `createEditor()`.
 *
 * Feature packages add their own options to this interface through
 * declaration merging, as `@openedit/extensions/collab` does with `collab`.
 */
export interface EditorOptions {
  /**
   * Features to enable, by registered name or as extensions.
   * @defaultValue `["basics"]`
   */
  features?: Array<FeatureName | OpenEditExtension>;
  /**
   * Initial content. With the `collab` feature it is only used to seed a
   * shared document that is still empty.
   */
  content?: EditorContent;
  /** Whether the document can be edited. @defaultValue `true` */
  editable?: boolean;
  /** Text shown while the document is empty. */
  placeholder?: string;
  /**
   * Name announced by screen readers when the editor gets focus.
   * @defaultValue `"Rich text editor"`
   */
  label?: string;
  /** Focus the editor once it is mounted. @defaultValue `false` */
  autofocus?: boolean | "start" | "end";
  /**
   * Element to mount into right away. Leave it out to create a detached
   * editor and call `editor.mount()` later.
   *
   * A detached editor can read and replace content and run commands, but
   * undo history, keyboard shortcuts and input rules only start on mount.
   */
  element?: HTMLElement | null;
  /** Called after every change to the document. */
  onUpdate?: (editor: OpenEditor) => void;
}

/** Events emitted by an editor. Every handler receives the editor. */
export type EditorEvent =
  "update" | "selectionUpdate" | "transaction" | "focus" | "blur" | "mount" | "unmount" | "destroy";

/** Handler for an {@link EditorEvent}. */
export type EditorEventHandler = (editor: OpenEditor) => void;
