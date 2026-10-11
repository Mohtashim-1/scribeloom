import { Editor as TiptapEditor, posToDOMRect } from "@tiptap/core";
import type { CanCommands, ChainedCommands, SingleCommands } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { hasFeature, resolveFeatures } from "./features";
import type {
  DocumentJSON,
  EditorContent,
  EditorEvent,
  EditorEventHandler,
  EditorOptions,
} from "./types";

const editors = new WeakMap<TiptapEditor, OpenEditor>();

/**
 * Returns the OpenEdit editor that owns an engine editor. For extension
 * authors, whose engine callbacks only receive the engine editor.
 */
export function getEditor(engine: TiptapEditor): OpenEditor | undefined {
  return editors.get(engine);
}

/**
 * An OpenEdit editor instance. Create one with `createEditor()`.
 *
 * It wraps the engine editor so app code depends on this surface instead of
 * on the engine. `engine` is the escape hatch for anything not covered here.
 */
export class OpenEditor {
  /** The underlying TipTap editor. Using it ties your code to the engine. */
  readonly engine: TiptapEditor;

  // The engine reports a never-mounted editor as destroyed, so track it here.
  #destroyed = false;

  constructor(options: EditorOptions = {}) {
    this.engine = new TiptapEditor({
      element: options.element ?? null,
      extensions: resolveFeatures(options).flatMap((extension) => extension.resolve()),
      // A collaborative document gets its content from the shared state. Setting
      // it here would insert it again on every client.
      content: hasFeature(options, "collab") ? undefined : (options.content ?? ""),
      editable: options.editable ?? true,
      autofocus: options.autofocus ?? false,
      editorProps: {
        // The engine already sets role="textbox"; say what kind, and name it.
        attributes: {
          "aria-multiline": "true",
          "aria-label": options.label ?? "Rich text editor",
        },
      },
    });
    editors.set(this.engine, this);
    if (options.onUpdate) {
      this.on("update", options.onUpdate);
    }
  }

  /** Attaches the editor to a DOM element. */
  mount(element: HTMLElement): void {
    this.engine.mount(element);
  }

  /** Detaches the editor from the DOM, keeping its state. */
  unmount(): void {
    this.engine.unmount();
  }

  /** Destroys the editor and removes all listeners. */
  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.engine.destroy();
  }

  /** Whether `destroy()` has been called. */
  get isDestroyed(): boolean {
    return this.#destroyed;
  }

  /** Whether the document has no content. */
  get isEmpty(): boolean {
    return this.engine.isEmpty;
  }

  /** Whether the editor is attached to the DOM. */
  get isMounted(): boolean {
    return !this.#destroyed && !this.engine.isDestroyed;
  }

  /** The editable DOM element, or `null` when not mounted. */
  get element(): HTMLElement | null {
    return this.isMounted ? this.engine.view.dom : null;
  }

  /** Whether the editor has keyboard focus. */
  get isFocused(): boolean {
    return this.isMounted && this.engine.isFocused;
  }

  /** Whether an extension, node or mark with this engine name is enabled. */
  has(name: string): boolean {
    return this.engine.extensionManager.extensions.some((extension) => extension.name === name);
  }

  /** Whether the document can be edited. */
  get isEditable(): boolean {
    return this.engine.isEditable;
  }

  /** Turns editing on or off. */
  setEditable(editable: boolean): void {
    this.engine.setEditable(editable);
  }

  /** The document as an HTML string. */
  getHTML(): string {
    return this.engine.getHTML();
  }

  /** The document as JSON. */
  getJSON(): DocumentJSON {
    return this.engine.getJSON();
  }

  /** The document as plain text. */
  getText(): string {
    return this.engine.getText();
  }

  /**
   * Replaces the whole document.
   *
   * @param options.emitUpdate - Whether to fire `update`. Defaults to `true`.
   */
  setContent(content: EditorContent, options: { emitUpdate?: boolean } = {}): void {
    this.engine.commands.setContent(content, { emitUpdate: options.emitUpdate ?? true });
  }

  /** Moves focus into the editor. */
  focus(position?: "start" | "end"): void {
    this.engine.commands.focus(position);
  }

  /** Single commands, each applied immediately. */
  get commands(): SingleCommands {
    return this.engine.commands;
  }

  /** Starts a command chain. Call `.run()` to apply it. */
  chain(): ChainedCommands {
    return this.engine.chain();
  }

  /** Checks whether a command could run, without running it. */
  can(): CanCommands {
    return this.engine.can();
  }

  /**
   * Whether a node or mark is active at the current selection.
   *
   * @example
   * ```ts
   * editor.isActive("bold");
   * editor.isActive("heading", { level: 2 });
   * editor.isActive({ textAlign: "center" }); // any node or mark with these attributes
   * ```
   */
  isActive(name: string, attributes?: Record<string, unknown>): boolean;
  isActive(attributes: Record<string, unknown>): boolean;
  isActive(
    nameOrAttributes: string | Record<string, unknown>,
    attributes?: Record<string, unknown>,
  ): boolean {
    return typeof nameOrAttributes === "string"
      ? this.engine.isActive(nameOrAttributes, attributes)
      : this.engine.isActive(nameOrAttributes);
  }

  /** Attributes of a node or mark at the current selection, e.g. a link's `href`. */
  getAttributes(name: string): Record<string, unknown> {
    return this.engine.getAttributes(name);
  }

  /** Whether the selection is collapsed to a cursor. */
  get isSelectionEmpty(): boolean {
    return this.engine.state.selection.empty;
  }

  /** The name of the node selected as a whole (e.g. `"image"`), if any. */
  get selectedNodeName(): string | null {
    const { selection } = this.engine.state;
    return selection instanceof NodeSelection ? selection.node.type.name : null;
  }

  /** Screen rectangle of the current selection, or `null` when not mounted. */
  getSelectionRect(): DOMRect | null {
    if (!this.isMounted) return null;
    const { from, to } = this.engine.state.selection;
    return posToDOMRect(this.engine.view, from, to);
  }

  /** Screen rectangle of a document range, or `null` when not mounted. */
  getRangeRect(from: number, to: number): DOMRect | null {
    if (!this.isMounted) return null;
    const size = this.engine.state.doc.content.size;
    const clamp = (pos: number) => Math.max(0, Math.min(pos, size));
    return posToDOMRect(this.engine.view, clamp(from), clamp(to));
  }

  /**
   * Screen rectangle of the closest node of the given type around the
   * selection (or the selected node itself), or `null` if there is none.
   */
  getNodeRect(name: string): DOMRect | null {
    if (!this.isMounted) return null;
    const { selection } = this.engine.state;
    const { view } = this.engine;
    if (selection instanceof NodeSelection && selection.node.type.name === name) {
      const dom = view.nodeDOM(selection.from);
      return dom instanceof HTMLElement ? dom.getBoundingClientRect() : null;
    }
    const { $from } = selection;
    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth).type.name === name) {
        const dom = view.nodeDOM($from.before(depth));
        return dom instanceof HTMLElement ? dom.getBoundingClientRect() : null;
      }
    }
    return null;
  }

  /**
   * Subscribes to an editor event.
   *
   * @returns A function that removes the listener.
   */
  on(event: EditorEvent, handler: EditorEventHandler): () => void {
    const listener = () => handler(this);
    this.engine.on(event, listener);
    return () => {
      this.engine.off(event, listener);
    };
  }
}

/**
 * Creates an editor.
 *
 * @example
 * ```ts
 * const editor = createEditor({
 *   element: document.querySelector("#editor"),
 *   content: "<p>Hello</p>",
 * });
 * ```
 */
export function createEditor(options: EditorOptions = {}): OpenEditor {
  return new OpenEditor(options);
}
