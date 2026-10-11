import {
  createStore,
  defineExtension,
  getEditor,
  registerFeature,
  type EditorContent,
  type OpenEditExtension,
  type OpenEditor,
  type Store,
} from "@openedit/core";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { Extension } from "@tiptap/core";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { IndexeddbPersistence } from "y-indexeddb";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import type { Comment, CommentsAdapter, CommentThread } from "./comments-adapters";

declare module "@openedit/core" {
  interface FeatureRegistry {
    collab: true;
  }
  interface EditorOptions {
    /** Settings for the `collab` feature. Required when it is enabled by name. */
    collab?: CollabOptions;
  }
}

/** How a collaborator appears to others. */
export interface CollabUser {
  name: string;
  /** Cursor colour, as a hex value such as `#5b4fe8`. */
  color: string;
}

/**
 * Options for the {@link collab} feature.
 */
export interface CollabOptions {
  /**
   * WebSocket URL of the collaboration server, e.g. `ws://localhost:1234`.
   * Leave it out to keep the shared document local, for instance to connect
   * it to a provider of your own through {@link Collab.document}.
   */
  url?: string;
  /** Name of the shared document. Everyone in the same room edits together. */
  room: string;
  /** The local user. */
  user: CollabUser;
  /** Sent to the server's auth hook. A function is called on every (re)connect. */
  token?: string | (() => string) | (() => Promise<string>);
  /**
   * Keep a copy in the browser (IndexedDB), so the document opens and can be
   * edited without a connection, and syncs once it is back.
   * @defaultValue `true`
   */
  offline?: boolean;
  /**
   * Content for a shared document that is still empty once it has synced.
   * Set from the editor's `content` option when the feature is enabled by name.
   */
  initialContent?: EditorContent;
  /** An existing Yjs document to use, instead of creating one. */
  document?: Y.Doc;
}

/** Connection state. `"local"` means no server was configured. */
export type CollabStatus = "connecting" | "connected" | "disconnected" | "local";

/** Someone present in the room. */
export interface CollabPeer extends CollabUser {
  /** Unique per connected editor. */
  clientId: number;
  isSelf: boolean;
}

/**
 * State of the collaboration session. Read it with {@link getCollab}.
 */
export interface CollabState {
  status: CollabStatus;
  /** Whether the document has caught up with the server at least once. */
  synced: boolean;
  /** Everyone in the room, the local user first. */
  peers: CollabPeer[];
}

/**
 * Handle for a collaboration session.
 */
export interface Collab {
  store: Store<CollabState>;
  /** The shared Yjs document. */
  document: Y.Doc;
  /** Presence information for the room. */
  awareness: Awareness;
  /** Reconnects after {@link Collab.disconnect}. */
  connect: () => void;
  /** Goes offline. Edits are kept and merged on the next connect. */
  disconnect: () => void;
  /** The local user, as shown to others. */
  user: CollabUser;
  /** Creates a comments store inside the shared document, so comments sync too. */
  createCommentsAdapter: () => CommentsAdapter;
}

/**
 * Stores comment threads in a Yjs document, so they sync and merge like the
 * text does. Replies are a shared list, so two people replying at once both
 * get through.
 */
export function yjsCommentsAdapter(doc: Y.Doc, key = "openedit-comments"): CommentsAdapter {
  const map = doc.getMap<Y.Map<unknown>>(key);
  const read = (): CommentThread[] =>
    Array.from(map.values()).map((thread) => ({
      id: String(thread.get("id")),
      resolved: thread.get("resolved") === true,
      createdAt: Number(thread.get("createdAt")),
      comments: ((thread.get("comments") as Y.Array<Comment> | undefined)?.toArray() ?? []).slice(),
    }));
  let snapshot = read();
  const listeners = new Set<() => void>();
  const onChange = () => {
    snapshot = read();
    listeners.forEach((listener) => listener());
  };
  map.observeDeep(onChange);

  return {
    getThreads: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    createThread: (thread) => {
      const entry = new Y.Map<unknown>();
      const replies = new Y.Array<Comment>();
      replies.push(thread.comments);
      entry.set("id", thread.id);
      entry.set("resolved", thread.resolved);
      entry.set("createdAt", thread.createdAt);
      entry.set("comments", replies);
      map.set(thread.id, entry);
    },
    addComment: (threadId, comment) => {
      (map.get(threadId)?.get("comments") as Y.Array<Comment> | undefined)?.push([comment]);
    },
    setResolved: (threadId, resolved) => {
      map.get(threadId)?.set("resolved", resolved);
    },
    deleteThread: (threadId) => {
      map.delete(threadId);
    },
    destroy: () => map.unobserveDeep(onChange),
  };
}

const STORAGE_NAME = "collab";
const FALLBACK_COLOR = "#6e6e7a";

/** Colours that read well as cursors on light and dark backgrounds. */
export const collabColors = [
  "#e5484d",
  "#f76b15",
  "#d9a400",
  "#30a46c",
  "#0091c2",
  "#3e63dd",
  "#8e4ec6",
  "#d6409f",
];

/**
 * Picks a stable colour from {@link collabColors} for a name or id.
 */
export function collabColorFor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return collabColors[Math.abs(hash) % collabColors.length]!;
}

// Presence data comes from other clients, so treat it as untrusted input.
function safeColor(value: unknown): string {
  return typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value) ? value : FALLBACK_COLOR;
}

function safeName(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 40) : "Anonymous";
}

function readPeers(awareness: Awareness): CollabPeer[] {
  const peers: CollabPeer[] = [];
  awareness.getStates().forEach((state, clientId) => {
    const user = (state as { user?: Partial<CollabUser> }).user;
    if (!user) return;
    peers.push({
      clientId,
      name: safeName(user.name),
      color: safeColor(user.color),
      isSelf: clientId === awareness.clientID,
    });
  });
  return peers.sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || a.clientId - b.clientId);
}

function renderCaret(user: Record<string, unknown>): HTMLElement {
  const color = safeColor(user.color);
  const caret = document.createElement("span");
  caret.className = "oe-caret";
  caret.style.setProperty("--oe-caret-color", color);
  const label = document.createElement("span");
  label.className = "oe-caret-label";
  label.textContent = safeName(user.name);
  // Decoration, not content: keep it out of what screen readers read as the text.
  label.setAttribute("aria-hidden", "true");
  caret.append(label);
  return caret;
}

/**
 * Returns the collaboration session of an editor, or `null` if the feature
 * is off.
 */
export function getCollab(editor: OpenEditor): Collab | null {
  const storage = editor.engine.storage as unknown as Record<string, unknown>;
  return (storage[STORAGE_NAME] as Collab | undefined) ?? null;
}

/**
 * Real-time collaboration: a shared document synced through a Hocuspocus
 * server, live cursors and selections, a presence list, and offline support.
 *
 * It replaces the normal undo history with one that only undoes your own
 * changes, so enable it together with `basics` by name (or pass
 * `basics({ history: false })`).
 *
 * @example
 * ```ts
 * createEditor({
 *   features: ["basics", "collab"],
 *   collab: { url: "ws://localhost:1234", room: "doc-1", user: { name: "Ada", color: "#3e63dd" } },
 * });
 * ```
 */
export function collab(options: CollabOptions): OpenEditExtension {
  return defineExtension({
    name: "collab",
    engine: () => {
      const doc = options.document ?? new Y.Doc();
      const store = createStore<CollabState>({
        status: options.url ? "connecting" : "local",
        synced: false,
        peers: [],
      });
      const patch = (next: Partial<CollabState>) =>
        store.setState({ ...store.getState(), ...next });

      // Called once the document has caught up with the server (or right away
      // when there is none). Replaced when the editor is created.
      let onReady = () => {};
      let ready = false;
      const markReady = () => {
        if (ready) return;
        ready = true;
        patch({ synced: true });
        onReady();
      };

      const provider = options.url
        ? new HocuspocusProvider({
            url: options.url,
            name: options.room,
            document: doc,
            token: options.token ?? null,
            onStatus: ({ status }) => patch({ status }),
            onSynced: ({ state }) => {
              if (state) markReady();
            },
          })
        : null;
      const awareness = provider?.awareness ?? new Awareness(doc);
      const onAwarenessChange = () => patch({ peers: readPeers(awareness) });
      awareness.on("change", onAwarenessChange);

      const local =
        options.offline !== false && typeof indexedDB !== "undefined"
          ? new IndexeddbPersistence(`openedit:${options.room}`, doc)
          : null;

      return [
        Collaboration.configure({ document: doc }),
        CollaborationCaret.configure({
          provider: { awareness },
          user: { name: safeName(options.user.name), color: safeColor(options.user.color) },
          render: renderCaret,
          selectionRender: (user) => ({
            class: "oe-caret-selection",
            style: `--oe-caret-color: ${safeColor(user.color)}`,
          }),
        }),
        Extension.create<object, Collab>({
          name: STORAGE_NAME,
          addStorage: () => ({
            store,
            document: doc,
            awareness,
            // Through the socket, which is what holds the connection.
            user: { name: safeName(options.user.name), color: safeColor(options.user.color) },
            createCommentsAdapter: () => yjsCommentsAdapter(doc),
            connect: () => void provider?.configuration.websocketProvider.connect(),
            disconnect: () => provider?.configuration.websocketProvider.disconnect(),
          }),
          onCreate() {
            const engine = this.editor;
            onReady = () => {
              const editor = getEditor(engine);
              if (options.initialContent && editor && !editor.isDestroyed && editor.isEmpty) {
                editor.setContent(options.initialContent);
              }
            };
            patch({ peers: readPeers(awareness) });
            if (ready) onReady();
            else if (!provider) markReady();
          },
          onDestroy() {
            awareness.off("change", onAwarenessChange);
            provider?.destroy();
            void local?.destroy();
            // Only tear down what we created.
            if (!provider) awareness.destroy();
            if (!options.document) doc.destroy();
          },
        }),
      ];
    },
  });
}

registerFeature("collab", (options) => {
  if (!options.collab) {
    throw new Error('The "collab" feature needs the `collab` option: { room, user, url? }.');
  }
  return collab({ initialContent: options.content, ...options.collab });
});
