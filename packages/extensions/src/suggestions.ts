import {
  createStore,
  defineExtension,
  getEditor,
  registerFeature,
  type OpenEditExtension,
  type OpenEditor,
  type Store,
} from "@openedit/core";
import { Extension, Mark } from "@tiptap/core";
import {
  Fragment,
  type Mark as ProseMirrorMark,
  type Node as ProseMirrorNode,
} from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection, type Transaction } from "@tiptap/pm/state";
import { ReplaceStep } from "@tiptap/pm/transform";
import { createId, resolveAuthor, type Author } from "./identity";

declare module "@openedit/core" {
  interface FeatureRegistry {
    suggestions: true;
  }
  interface EditorOptions {
    /** Settings for the `suggestions` feature. */
    suggestions?: SuggestionsOptions;
  }
}

/**
 * Options for the {@link suggestions} feature.
 */
export interface SuggestionsOptions {
  /**
   * Who is suggesting. Defaults to the collaboration user when `collab` is
   * on, otherwise to "You".
   */
  user?: Author;
  /** Start in suggesting mode. @defaultValue `false` */
  enabled?: boolean;
}

/** A pending change: text to add, text to remove, or both (a replacement). */
export interface Suggestion {
  id: string;
  author: string;
  createdAt: number;
  /** Text this suggestion would add. */
  inserted: string;
  /** Text this suggestion would remove. */
  deleted: string;
}

/**
 * State of the suggestions feature. Read it with {@link getSuggestions}.
 */
export interface SuggestionsState {
  /** Whether edits are recorded as suggestions instead of applied. */
  enabled: boolean;
  /** Pending suggestions, in document order. */
  suggestions: Suggestion[];
}

/**
 * Handle for working with suggestions.
 */
export interface Suggestions {
  store: Store<SuggestionsState>;
  setEnabled: (enabled: boolean) => void;
  /** Applies a suggestion: added text stays, removed text goes. */
  accept: (id: string) => void;
  /** Discards a suggestion: added text goes, removed text stays. */
  reject: (id: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
}

const STORAGE_NAME = "suggestions";
const INSERT = "suggestionInsert";
const DELETE = "suggestionDelete";
const pluginKey = new PluginKey("openeditSuggestions");

function suggestionMark(name: string, tag: "ins" | "del", className: string) {
  return Mark.create({
    name,
    inclusive: false,
    addAttributes: () => ({
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-suggestion-id"),
        renderHTML: (attributes: { id?: string }) => ({ "data-suggestion-id": attributes.id }),
      },
      author: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-author"),
        renderHTML: (attributes: { author?: string }) => ({ "data-author": attributes.author }),
      },
      createdAt: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          Number(element.getAttribute("data-created-at")) || null,
        renderHTML: (attributes: { createdAt?: number }) => ({
          "data-created-at": attributes.createdAt,
        }),
      },
    }),
    parseHTML: () => [{ tag: `${tag}[data-suggestion-id]` }],
    renderHTML: ({ HTMLAttributes }) => [tag, { ...HTMLAttributes, class: className }, 0],
  });
}

const markOf = (node: ProseMirrorNode, name: string) =>
  node.marks.find((mark) => mark.type.name === name);

/** Collects the pending suggestions from the document. */
function collect(doc: ProseMirrorNode): Suggestion[] {
  const byId = new Map<string, Suggestion>();
  doc.descendants((node) => {
    if (!node.isInline) return;
    for (const [name, field] of [
      [INSERT, "inserted"],
      [DELETE, "deleted"],
    ] as const) {
      const mark = markOf(node, name);
      if (!mark) continue;
      const id = String(mark.attrs.id);
      const entry = byId.get(id) ?? {
        id,
        author: String(mark.attrs.author ?? ""),
        createdAt: Number(mark.attrs.createdAt) || 0,
        inserted: "",
        deleted: "",
      };
      entry[field] += node.isText ? (node.text ?? "") : " ";
      byId.set(id, entry);
    }
  });
  return [...byId.values()];
}

/** Ranges carrying a suggestion mark, optionally only for one suggestion id. */
function rangesOf(doc: ProseMirrorNode, name: string, id?: string) {
  const ranges: Array<{ from: number; to: number; mark: ProseMirrorMark }> = [];
  doc.descendants((node, pos) => {
    const mark = markOf(node, name);
    if (mark && (id === undefined || mark.attrs.id === id)) {
      ranges.push({ from: pos, to: pos + node.nodeSize, mark });
    }
  });
  return ranges;
}

/**
 * Returns the suggestions handle of an editor, or `null` if the feature is off.
 */
export function getSuggestions(editor: OpenEditor): Suggestions | null {
  const storage = editor.engine.storage as unknown as Record<string, unknown>;
  return (storage[STORAGE_NAME] as Suggestions | undefined) ?? null;
}

/**
 * Suggestion mode ("track changes"). While it is on, typing is marked as a
 * proposed insertion and deleting marks text as a proposed deletion instead
 * of removing it. Each suggestion can then be accepted or rejected.
 *
 * Tracked: typing, deleting and replacing text within a block. Changes to
 * structure (splitting or joining blocks, pasting several blocks) and to
 * formatting are applied directly; any text they add is still marked.
 */
export function suggestions(options: SuggestionsOptions = {}): OpenEditExtension {
  return defineExtension({
    name: "suggestions",
    engine: () => {
      const store = createStore<SuggestionsState>({
        enabled: options.enabled ?? false,
        suggestions: [],
      });

      return [
        suggestionMark(INSERT, "ins", "oe-suggest-insert"),
        suggestionMark(DELETE, "del", "oe-suggest-delete"),

        Extension.create<object, Suggestions>({
          name: STORAGE_NAME,

          addStorage() {
            // Filled in by onBeforeCreate, once the editor exists.
            return { store } as Suggestions;
          },

          onBeforeCreate() {
            const engine = this.editor;
            /** Applies marks-and-deletes for the chosen suggestions in one step. */
            const settle = (keep: string, drop: string, id?: string) => {
              const { doc, schema } = engine.state;
              const tr = engine.state.tr.setMeta(pluginKey, "settle");
              rangesOf(doc, keep, id).forEach(({ from, to }) =>
                tr.removeMark(from, to, schema.marks[keep]),
              );
              // Back to front, so earlier positions stay valid.
              rangesOf(doc, drop, id)
                .reverse()
                .forEach(({ from, to }) => tr.delete(tr.mapping.map(from), tr.mapping.map(to)));
              if (tr.steps.length) engine.view.dispatch(tr);
            };
            const api: Suggestions = {
              store,
              setEnabled: (enabled) => store.setState({ ...store.getState(), enabled }),
              accept: (id) => settle(INSERT, DELETE, id),
              reject: (id) => settle(DELETE, INSERT, id),
              acceptAll: () => settle(INSERT, DELETE),
              rejectAll: () => settle(DELETE, INSERT),
            };
            Object.assign(this.storage, api);
          },

          addProseMirrorPlugins() {
            const engine = this.editor;
            // Which way the last key deletes, to know where the cursor belongs.
            let forwardDelete = false;

            const refresh = (doc: ProseMirrorNode) => {
              const next = collect(doc);
              const current = store.getState();
              const same =
                next.length === current.suggestions.length &&
                next.every((item, index) => {
                  const other = current.suggestions[index]!;
                  return (
                    item.id === other.id &&
                    item.inserted === other.inserted &&
                    item.deleted === other.deleted
                  );
                });
              if (!same) store.setState({ ...current, suggestions: next });
            };

            /** Whether a transaction is a direct edit by the local user. */
            const isUserEdit = (tr: Transaction) =>
              tr.docChanged &&
              !tr.getMeta(pluginKey) &&
              // Remote changes and collaborative undo arrive through y-sync.
              !tr.getMeta("y-sync$") &&
              !tr.getMeta("history$");

            return [
              new Plugin({
                key: pluginKey,
                props: {
                  handleKeyDown(_view, event) {
                    forwardDelete = event.key === "Delete";
                    return false;
                  },
                },
                view: () => ({
                  update: (view, previous) => {
                    if (!view.state.doc.eq(previous.doc)) refresh(view.state.doc);
                  },
                }),
                appendTransaction(transactions, _oldState, newState) {
                  if (!store.getState().enabled) return null;
                  const edits = transactions.filter(isUserEdit);
                  if (!edits.length) return null;
                  const editor = getEditor(engine);
                  const author = editor ? resolveAuthor(editor, options.user).name : "You";
                  const { schema } = newState;
                  const insertType = schema.marks[INSERT]!;
                  const deleteType = schema.marks[DELETE]!;
                  const tr = newState.tr.setMeta(pluginKey, "track");
                  let cursor: number | null = null;

                  for (const edit of edits) {
                    edit.steps.forEach((step, index) => {
                      if (!(step instanceof ReplaceStep)) return;
                      const before = edit.docs[index]!;
                      // Later steps of this edit, then what we have appended so far.
                      const later = edit.mapping.slice(index + 1);
                      const toNow = (pos: number, assoc: number) =>
                        tr.mapping.map(later.map(pos, assoc), assoc);

                      const insertFrom = toNow(step.from, -1);
                      const insertTo = tr.mapping.map(
                        later.map(step.from + step.slice.size, 1),
                        -1,
                      );
                      const $from = before.resolve(step.from);
                      const inline =
                        $from.sameParent(before.resolve(step.to)) &&
                        $from.parent.isTextblock &&
                        step.slice.openStart === 0 &&
                        step.slice.openEnd === 0;

                      // Reuse the id of the suggestion we are continuing, if any.
                      // Typing continues to the right of earlier text; deleting can
                      // continue on either side (Backspace moves left, Delete right).
                      const neighbour = (name: string) => {
                        const $pos = tr.doc.resolve(insertFrom);
                        const sides =
                          name === DELETE ? [$pos.nodeBefore, $pos.nodeAfter] : [$pos.nodeBefore];
                        for (const node of sides) {
                          const mark = node ? markOf(node, name) : undefined;
                          if (mark?.attrs.author === author) return mark;
                        }
                        return undefined;
                      };
                      const removed: ProseMirrorNode[] = [];
                      if (inline && step.from < step.to) {
                        before.slice(step.from, step.to).content.forEach((node) => {
                          // Deleting your own pending insertion just removes it.
                          if (!markOf(node, INSERT)) removed.push(node);
                        });
                      }
                      const continued =
                        (step.slice.size > 0 && !removed.length ? neighbour(INSERT) : undefined) ??
                        (removed.length && !step.slice.size ? neighbour(DELETE) : undefined);
                      const attrs = continued?.attrs ?? {
                        id: createId(),
                        author,
                        createdAt: Date.now(),
                      };

                      if (insertTo > insertFrom) {
                        tr.removeMark(insertFrom, insertTo, deleteType);
                        tr.addMark(insertFrom, insertTo, insertType.create(attrs));
                      }
                      if (removed.length) {
                        // Put the deleted text back, marked as a proposed deletion.
                        const restored = Fragment.from(
                          removed.map((node) =>
                            markOf(node, DELETE)
                              ? node
                              : node.mark(deleteType.create(attrs).addToSet(node.marks)),
                          ),
                        );
                        tr.insert(insertFrom, restored);
                        if (step.slice.size === 0) {
                          cursor = forwardDelete ? insertFrom + restored.size : insertFrom;
                        }
                      }
                    });
                  }

                  if (!tr.steps.length) return null;
                  if (cursor !== null) tr.setSelection(TextSelection.create(tr.doc, cursor));
                  return tr;
                },
              }),
            ];
          },

          onCreate() {
            store.setState({ ...store.getState(), suggestions: collect(this.editor.state.doc) });
          },
        }),
      ];
    },
  });
}

registerFeature("suggestions", (options) => suggestions(options.suggestions));
