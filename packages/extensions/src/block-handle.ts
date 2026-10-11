import {
  createStore,
  defineExtension,
  getEditor,
  registerFeature,
  type OpenEditExtension,
  type OpenEditor,
  type Store,
} from "@openedit/core";
import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

declare module "@openedit/core" {
  interface FeatureRegistry {
    "block-handle": true;
  }
}

/**
 * State of the block handle. Read it with {@link getBlockHandle}.
 */
export interface BlockHandleState {
  /** Document position of the block under the pointer, or `null`. */
  pos: number | null;
  /** Engine name of that block's type, e.g. `"paragraph"`. */
  type: string | null;
}

/**
 * Handle for the block under the pointer: where it is, and what can be done
 * to it.
 */
export interface BlockHandle {
  store: Store<BlockHandleState>;
  /** Screen rectangle of the block, to position a handle beside it. */
  getRect: () => DOMRect | null;
  /**
   * Keeps the current block while the pointer is on the handle or its menu,
   * which sit outside the document.
   */
  setLocked: (locked: boolean) => void;
  /** Adds an empty paragraph below the block and puts the cursor in it. */
  insertBelow: () => void;
  remove: () => void;
  duplicate: () => void;
  /** Swaps the block with its neighbour. `-1` is up, `1` is down. */
  move: (direction: -1 | 1) => void;
  /** Puts the cursor in the block, e.g. before running a command on it. */
  select: () => void;
  /** Call from the handle's `dragstart`, so the block can be dropped elsewhere. */
  startDrag: (event: DragEvent) => void;
  /** Call from the handle's `dragend`. */
  endDrag: () => void;
}

const STORAGE_NAME = "blockHandle";
const HIDE_DELAY = 180;

/**
 * Returns the block handle of an editor, or `null` if the feature is off.
 */
export function getBlockHandle(editor: OpenEditor): BlockHandle | null {
  const storage = editor.engine.storage as unknown as Record<string, unknown>;
  return (storage[STORAGE_NAME] as BlockHandle | undefined) ?? null;
}

/**
 * Tracks the top-level block under the pointer and offers actions on it:
 * insert below, delete, duplicate, move, and drag to reorder. Headless:
 * `BlockHandle` in `@openedit/ui` draws the handle.
 */
export function blockHandle(): OpenEditExtension {
  return defineExtension({
    name: "block-handle",
    engine: () => {
      const store = createStore<BlockHandleState>({ pos: null, type: null });

      return Extension.create<object, BlockHandle>({
        name: STORAGE_NAME,

        addStorage() {
          // Filled in by onBeforeCreate, once the editor exists.
          return { store } as BlockHandle;
        },

        onBeforeCreate() {
          const engine = this.editor;
          const current = () => {
            const { pos } = store.getState();
            const node = pos === null ? null : engine.state.doc.nodeAt(pos);
            return node && pos !== null ? { pos, node } : null;
          };
          const api: BlockHandle = {
            store,
            getRect: () => {
              const block = current();
              if (!block || !getEditor(engine)?.isMounted) return null;
              const dom = engine.view.nodeDOM(block.pos);
              return dom instanceof HTMLElement ? dom.getBoundingClientRect() : null;
            },
            setLocked: (locked) => {
              (this.storage as unknown as { locked: boolean }).locked = locked;
            },
            insertBelow: () => {
              const block = current();
              if (!block) return;
              const at = block.pos + block.node.nodeSize;
              const tr = engine.state.tr.insert(at, engine.schema.nodes.paragraph!.create());
              engine.view.dispatch(
                tr.setSelection(TextSelection.create(tr.doc, at + 1)).scrollIntoView(),
              );
              engine.view.focus();
            },
            remove: () => {
              const block = current();
              if (!block) return;
              engine.view.dispatch(
                engine.state.tr.delete(block.pos, block.pos + block.node.nodeSize),
              );
              store.setState({ pos: null, type: null });
            },
            duplicate: () => {
              const block = current();
              if (!block) return;
              engine.view.dispatch(
                engine.state.tr.insert(
                  block.pos + block.node.nodeSize,
                  block.node.copy(block.node.content),
                ),
              );
            },
            move: (direction) => {
              const block = current();
              if (!block) return;
              const $pos = engine.state.doc.resolve(block.pos);
              const index = $pos.index();
              const other = $pos.parent.maybeChild(index + direction);
              if (!other) return;
              const start = direction === -1 ? block.pos - other.nodeSize : block.pos;
              const [first, second] = direction === -1 ? [block.node, other] : [other, block.node];
              const tr = engine.state.tr.replaceWith(
                start,
                start + first.nodeSize + second.nodeSize,
                [first, second],
              );
              const moved = direction === -1 ? start : start + other.nodeSize;
              // Keep the cursor where it was inside the block that moved.
              const { selection } = engine.state;
              const offset = selection.from - block.pos;
              if (offset > 0 && offset < block.node.nodeSize) {
                tr.setSelection(TextSelection.near(tr.doc.resolve(moved + offset)));
              }
              engine.view.dispatch(tr.scrollIntoView());
              store.setState({ pos: moved, type: block.node.type.name });
            },
            select: () => {
              const block = current();
              if (!block) return;
              const selection = block.node.isTextblock
                ? TextSelection.create(engine.state.doc, block.pos + 1)
                : NodeSelection.create(engine.state.doc, block.pos);
              engine.view.dispatch(engine.state.tr.setSelection(selection));
              engine.view.focus();
            },
            startDrag: (event) => {
              const block = current();
              if (!block || !event.dataTransfer) return;
              const selection = NodeSelection.create(engine.state.doc, block.pos);
              engine.view.dispatch(engine.state.tr.setSelection(selection));
              const dom = engine.view.nodeDOM(block.pos);
              if (dom instanceof HTMLElement) event.dataTransfer.setDragImage(dom, 0, 0);
              event.dataTransfer.effectAllowed = "move";
              // Some browsers refuse to start a drag that carries no data.
              event.dataTransfer.setData("text/plain", block.node.textContent);
              // Tells the editor's own drop handling which content is on the move.
              engine.view.dragging = { slice: selection.content(), move: true };
              // The handle is the drag source: if it went away mid-drag (the
              // pointer has left its block), the browser would cancel the drop.
              // Tracked apart from `locked`, which the UI clears on mouse leave.
              (this.storage as unknown as { dragging: boolean }).dragging = true;
            },
            endDrag: () => {
              engine.view.dragging = null;
              (this.storage as unknown as { dragging: boolean }).dragging = false;
              store.setState({ pos: null, type: null });
            },
          };
          Object.assign(this.storage, api, { locked: false, dragging: false });
        },

        // Moving blocks without a pointer: the block the cursor is in.
        addKeyboardShortcuts() {
          const moveCurrent = (direction: -1 | 1) => () => {
            const { $from } = this.editor.state.selection;
            if ($from.depth === 0) return false;
            store.setState({ pos: $from.before(1), type: $from.node(1).type.name });
            this.storage.move(direction);
            store.setState({ pos: null, type: null });
            return true;
          };
          return { "Mod-Shift-ArrowUp": moveCurrent(-1), "Mod-Shift-ArrowDown": moveCurrent(1) };
        },

        addProseMirrorPlugins() {
          const storage = this.storage as unknown as { locked: boolean; dragging: boolean };
          let hideTimer: ReturnType<typeof setTimeout> | undefined;

          const show = (pos: number, type: string) => {
            clearTimeout(hideTimer);
            if (store.getState().pos !== pos) store.setState({ pos, type });
          };
          const hideSoon = () => {
            clearTimeout(hideTimer);
            hideTimer = setTimeout(() => {
              if (!storage.locked && !storage.dragging) store.setState({ pos: null, type: null });
              else hideSoon();
            }, HIDE_DELAY);
          };

          return [
            new Plugin({
              key: new PluginKey("openeditBlockHandle"),
              props: {
                handleDOMEvents: {
                  mousemove(view, event) {
                    if (!view.editable) return false;
                    // The pointer may be in the gutter, left of the text: look
                    // across to the block on the same line.
                    const root = view.dom;
                    let element = event.target instanceof Element ? event.target : null;
                    if (element === root) {
                      const box = root.getBoundingClientRect();
                      const inset = parseFloat(getComputedStyle(root).paddingLeft) + 8;
                      element = document.elementFromPoint(box.left + inset, event.clientY);
                    }
                    while (element && element.parentElement !== root)
                      element = element.parentElement;
                    if (!element) return false;
                    try {
                      const inside = view.posAtDOM(element, 0);
                      const $pos = view.state.doc.resolve(inside);
                      const pos = $pos.depth === 0 ? inside : $pos.before(1);
                      const node = view.state.doc.nodeAt(pos);
                      if (node) show(pos, node.type.name);
                    } catch {
                      // The element is not part of the document (a widget, say).
                    }
                    return false;
                  },
                  mouseleave() {
                    hideSoon();
                    return false;
                  },
                  keydown() {
                    // Typing means the pointer is no longer what matters.
                    if (store.getState().pos !== null && !storage.locked && !storage.dragging) {
                      store.setState({ pos: null, type: null });
                    }
                    return false;
                  },
                },
              },
              // Keep pointing at the same block as the document changes around it.
              appendTransaction(transactions) {
                const { pos } = store.getState();
                if (pos === null) return null;
                const changed = transactions.filter((tr) => tr.docChanged);
                if (!changed.length) return null;
                const mapped = changed.reduce((at, tr) => tr.mapping.map(at, 1), pos);
                if (mapped !== pos) store.setState({ ...store.getState(), pos: mapped });
                return null;
              },
              view: () => ({ destroy: () => clearTimeout(hideTimer) }),
            }),
          ];
        },
      });
    },
  });
}

registerFeature("block-handle", () => blockHandle());
