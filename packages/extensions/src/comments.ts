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
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  memoryCommentsAdapter,
  type Comment,
  type CommentsAdapter,
  type CommentThread,
} from "./comments-adapters";
import { createId, resolveAuthor, type Author } from "./identity";

declare module "@openedit/core" {
  interface FeatureRegistry {
    comments: true;
  }
  interface EditorOptions {
    /** Settings for the `comments` feature. */
    comments?: CommentsOptions;
  }
}

/**
 * Options for the {@link comments} feature.
 */
export interface CommentsOptions {
  /**
   * Who is commenting. Defaults to the collaboration user when `collab` is
   * on, otherwise to "You".
   */
  user?: Author;
  /**
   * Where threads are stored. Defaults to the shared document when `collab`
   * is on (so comments sync with it), otherwise to memory.
   */
  adapter?: CommentsAdapter;
  /** Called when storing a change fails. */
  onError?: (error: Error) => void;
}

/** A thread, plus where it stands in the document. */
export interface ThreadView extends CommentThread {
  /** The commented text. Empty if the text has since been deleted. */
  quote: string;
  /** Whether the commented text is gone from the document. */
  orphaned: boolean;
}

/**
 * State of the comments feature. Read it with {@link getComments}.
 */
export interface CommentsState {
  /** All threads, in document order, orphaned ones last. */
  threads: ThreadView[];
  /** The thread the cursor is in, or the one picked in the UI. */
  activeThreadId: string | null;
  /** Whether a new comment is being written for the current selection. */
  drafting: boolean;
}

/**
 * Handle for working with comments.
 */
export interface Comments {
  store: Store<CommentsState>;
  /** Whether a comment can be added: there is a text selection to anchor it to. */
  canComment: () => boolean;
  /** Opens / closes the "new comment" state, for a UI to show a composer. */
  setDrafting: (drafting: boolean) => void;
  /**
   * Starts a thread on the current selection.
   * @returns The thread id, or `null` if there is no selection or the text is empty.
   */
  addThread: (body: string) => string | null;
  reply: (threadId: string, body: string) => void;
  resolve: (threadId: string) => void;
  reopen: (threadId: string) => void;
  /** Deletes a thread and removes its highlight from the document. */
  remove: (threadId: string) => void;
  /** Marks a thread as active, and optionally selects and scrolls to its text. */
  setActive: (threadId: string | null, options?: { scroll?: boolean }) => void;
}

const STORAGE_NAME = "comments";
const MAX_BODY_LENGTH = 10_000;
const pluginKey = new PluginKey<Map<string, Array<{ from: number; to: number }>>>(
  "openeditComments",
);

/** Finds where each thread's mark sits in the document. */
function findRanges(doc: ProseMirrorNode) {
  const ranges = new Map<string, Array<{ from: number; to: number }>>();
  doc.descendants((node, pos) => {
    for (const mark of node.marks) {
      if (mark.type.name !== "comment") continue;
      const id = String(mark.attrs.threadId);
      const list = ranges.get(id) ?? [];
      const last = list[list.length - 1];
      // Adjacent text nodes with the same mark are one range.
      if (last && last.to === pos) last.to = pos + node.nodeSize;
      else list.push({ from: pos, to: pos + node.nodeSize });
      ranges.set(id, list);
    }
  });
  return ranges;
}

/**
 * Returns the comments handle of an editor, or `null` if the feature is off.
 */
export function getComments(editor: OpenEditor): Comments | null {
  const storage = editor.engine.storage as unknown as Record<string, unknown>;
  return (storage[STORAGE_NAME] as Comments | undefined) ?? null;
}

/**
 * Comment threads anchored to text. The anchor is a mark in the document, so
 * it moves with the text as people edit around it, including in real-time
 * collaboration. Headless: a UI such as `CommentsSidebar` in `@openedit/ui`
 * renders the state from {@link getComments}.
 */
export function comments(options: CommentsOptions = {}): OpenEditExtension {
  return defineExtension({
    name: "comments",
    engine: () => {
      const store = createStore<CommentsState>({
        threads: [],
        activeThreadId: null,
        drafting: false,
      });
      const report = options.onError ?? ((error: Error) => console.error(error));
      const run = (result: void | Promise<void>) => {
        if (result instanceof Promise) {
          result.catch((error: unknown) =>
            report(error instanceof Error ? error : new Error(String(error))),
          );
        }
      };

      return [
        Mark.create({
          name: "comment",
          // Typing at the edge of a commented range does not extend it.
          inclusive: false,
          // Threads may overlap, so one comment mark does not replace another.
          excludes: "",
          addAttributes: () => ({
            threadId: {
              default: null,
              parseHTML: (element: HTMLElement) => element.getAttribute("data-thread-id"),
              renderHTML: (attributes: { threadId?: string }) => ({
                "data-thread-id": attributes.threadId,
              }),
            },
          }),
          parseHTML: () => [{ tag: "span[data-thread-id]" }],
          renderHTML: ({ HTMLAttributes }) => [
            "span",
            { ...HTMLAttributes, class: "oe-comment" },
            0,
          ],
        }),

        Extension.create<object, Comments>({
          name: STORAGE_NAME,

          addStorage() {
            // Filled in by onBeforeCreate, once the editor exists.
            return { store } as Comments;
          },

          onBeforeCreate() {
            const engine = this.editor;
            // Looked up on use: the wrapper is registered just after this hook runs.
            const current = () => getEditor(engine)!;
            const shared = engine.storage as unknown as {
              collab?: { createCommentsAdapter?: () => CommentsAdapter };
            };
            const adapter =
              options.adapter ??
              shared.collab?.createCommentsAdapter?.() ??
              memoryCommentsAdapter();
            const markType = () => engine.schema.marks.comment!;
            const ranges = () => pluginKey.getState(engine.state) ?? new Map();

            let drawn = "";
            const sync = (patch: Partial<CommentsState> = {}) => {
              const next = { ...store.getState(), ...patch };
              const found = ranges();
              const position = (thread: CommentThread) =>
                found.get(thread.id)?.[0]?.from ?? Number.MAX_SAFE_INTEGER;
              const threads = adapter
                .getThreads()
                .map((thread): ThreadView => {
                  const spans = found.get(thread.id) ?? [];
                  return {
                    ...thread,
                    orphaned: spans.length === 0,
                    quote: spans
                      .map(({ from, to }: { from: number; to: number }) =>
                        engine.state.doc.textBetween(from, to, " "),
                      )
                      .join(" "),
                  };
                })
                .sort((a, b) => position(a) - position(b) || a.createdAt - b.createdAt);
              if (!threads.some((thread) => thread.id === next.activeThreadId)) {
                next.activeThreadId = null;
              }
              // This runs on every edit; only notify when something is different.
              const before = store.getState();
              const unchanged =
                before.activeThreadId === next.activeThreadId &&
                before.drafting === next.drafting &&
                before.threads.length === threads.length &&
                threads.every((thread, index) => {
                  const other = before.threads[index]!;
                  return (
                    thread.id === other.id &&
                    thread.quote === other.quote &&
                    thread.resolved === other.resolved &&
                    thread.orphaned === other.orphaned &&
                    thread.comments.length === other.comments.length
                  );
                });
              if (!unchanged) store.setState({ ...next, threads });
              // Redraw the highlights when what they depend on has changed.
              const signature = `${next.activeThreadId}|${threads
                .filter((thread) => thread.resolved)
                .map((thread) => thread.id)
                .join(",")}`;
              if (signature !== drawn && current().isMounted) {
                drawn = signature;
                engine.view.dispatch(engine.state.tr.setMeta(pluginKey, "redraw"));
              }
            };

            const stopListening = adapter.subscribe(() => sync());
            const author = () => resolveAuthor(current(), options.user);
            const newComment = (body: string): Comment => ({
              id: createId(),
              author: author(),
              body: body.trim().slice(0, MAX_BODY_LENGTH),
              createdAt: Date.now(),
            });

            const api: Comments = {
              store,
              canComment: () =>
                current().isEditable && !current().isSelectionEmpty && !current().selectedNodeName,
              setDrafting: (drafting) => sync({ drafting }),
              addThread: (body) => {
                if (!body.trim() || !api.canComment()) return null;
                const thread: CommentThread = {
                  id: createId(),
                  resolved: false,
                  createdAt: Date.now(),
                  comments: [newComment(body)],
                };
                const { from, to } = engine.state.selection;
                engine.view.dispatch(
                  engine.state.tr
                    .addMark(from, to, markType().create({ threadId: thread.id }))
                    // Anchoring a comment is not an edit the user expects to undo.
                    .setMeta("addToHistory", false),
                );
                run(adapter.createThread(thread));
                sync({ drafting: false, activeThreadId: thread.id });
                return thread.id;
              },
              reply: (threadId, body) => {
                if (body.trim()) run(adapter.addComment(threadId, newComment(body)));
              },
              resolve: (threadId) => run(adapter.setResolved(threadId, true)),
              reopen: (threadId) => run(adapter.setResolved(threadId, false)),
              remove: (threadId) => {
                const spans: Array<{ from: number; to: number }> = ranges().get(threadId) ?? [];
                if (spans.length) {
                  const tr = engine.state.tr.setMeta("addToHistory", false);
                  spans.forEach(({ from, to }) =>
                    tr.removeMark(from, to, markType().create({ threadId })),
                  );
                  engine.view.dispatch(tr);
                }
                run(adapter.deleteThread(threadId));
              },
              setActive: (threadId, { scroll = false } = {}) => {
                sync({ activeThreadId: threadId });
                const span = threadId ? ranges().get(threadId)?.[0] : undefined;
                if (scroll && span) {
                  current().chain().setTextSelection(span.from).scrollIntoView().run();
                }
              },
            };
            Object.assign(this.storage, api);
            // Kept for the plugin and for teardown.
            Object.assign(this.storage, {
              sync,
              teardown: () => (stopListening(), adapter.destroy?.()),
            });
          },

          onCreate() {
            (this.storage as unknown as { sync: () => void }).sync();
          },

          onDestroy() {
            (this.storage as unknown as { teardown?: () => void }).teardown?.();
          },

          addProseMirrorPlugins() {
            const storage = this.storage as unknown as {
              sync?: (patch?: Partial<CommentsState>) => void;
            };
            return [
              new Plugin({
                key: pluginKey,
                state: {
                  init: (_config, state) => findRanges(state.doc),
                  apply: (tr, value) => (tr.docChanged ? findRanges(tr.doc) : value),
                },
                props: {
                  decorations(state) {
                    const { threads, activeThreadId } = store.getState();
                    const resolved = new Set(
                      threads.filter((thread) => thread.resolved).map((thread) => thread.id),
                    );
                    const decorations: Decoration[] = [];
                    pluginKey.getState(state)?.forEach((spans, id) => {
                      const className = resolved.has(id)
                        ? "oe-comment-resolved"
                        : id === activeThreadId
                          ? "oe-comment-active"
                          : null;
                      if (!className) return;
                      spans.forEach(({ from, to }) =>
                        decorations.push(Decoration.inline(from, to, { class: className })),
                      );
                    });
                    return DecorationSet.create(state.doc, decorations);
                  },
                },
                view: () => ({
                  update(view, previous) {
                    if (
                      view.state.doc.eq(previous.doc) &&
                      view.state.selection.eq(previous.selection)
                    ) {
                      return;
                    }
                    // The thread under the cursor becomes the active one.
                    const { $from, empty } = view.state.selection;
                    const here = empty
                      ? $from.marks().find((mark) => mark.type.name === "comment")
                      : undefined;
                    const next = here
                      ? String(here.attrs.threadId)
                      : store.getState().activeThreadId;
                    // Deferred: this runs during a view update, and syncing dispatches.
                    queueMicrotask(() => {
                      if (!view.isDestroyed) storage.sync?.(here ? { activeThreadId: next } : {});
                    });
                  },
                }),
              }),
            ];
          },
        }),
      ];
    },
  });
}

registerFeature("comments", (options) => comments(options.comments));
