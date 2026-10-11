import type { Author } from "./identity";

/** One message in a thread. */
export interface Comment {
  id: string;
  author: Author;
  body: string;
  /** Milliseconds since the epoch. */
  createdAt: number;
}

/** A comment thread, anchored to a range of the document by its id. */
export interface CommentThread {
  id: string;
  resolved: boolean;
  createdAt: number;
  comments: Comment[];
}

/**
 * Where comment threads are stored. The document only holds the anchor (a
 * mark carrying the thread id); the text of the comments lives here.
 *
 * Methods may return a promise; failures are reported through the comments
 * feature's `onError`.
 */
export interface CommentsAdapter {
  /** The current threads. Must return the same array until something changes. */
  getThreads(): CommentThread[];
  /** Calls `listener` whenever the threads change. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  createThread(thread: CommentThread): void | Promise<void>;
  addComment(threadId: string, comment: Comment): void | Promise<void>;
  setResolved(threadId: string, resolved: boolean): void | Promise<void>;
  deleteThread(threadId: string): void | Promise<void>;
  destroy?(): void;
}

/**
 * Keeps threads in memory. Use `initial` and `onChange` to load and save
 * them yourself, for example alongside the document.
 */
export function memoryCommentsAdapter(
  options: { initial?: CommentThread[]; onChange?: (threads: CommentThread[]) => void } = {},
): CommentsAdapter {
  let threads = options.initial ?? [];
  const listeners = new Set<() => void>();
  const set = (next: CommentThread[]) => {
    threads = next;
    options.onChange?.(threads);
    listeners.forEach((listener) => listener());
  };
  return {
    getThreads: () => threads,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    createThread: (thread) => set([...threads, thread]),
    addComment: (threadId, comment) =>
      set(
        threads.map((thread) =>
          thread.id === threadId ? { ...thread, comments: [...thread.comments, comment] } : thread,
        ),
      ),
    setResolved: (threadId, resolved) =>
      set(threads.map((thread) => (thread.id === threadId ? { ...thread, resolved } : thread))),
    deleteThread: (threadId) => set(threads.filter((thread) => thread.id !== threadId)),
  };
}

/**
 * Options for {@link restCommentsAdapter}.
 */
export interface RestCommentsOptions {
  /** Base URL of the threads collection, e.g. `/api/documents/42/threads`. */
  url: string;
  /** Extra headers, such as `Authorization`. A function is called per request. */
  headers?: Record<string, string> | (() => Record<string, string>);
  /** Replacement for the global `fetch`, e.g. for tests. */
  fetch?: typeof fetch;
}

/**
 * Stores threads on your server over a small REST API:
 *
 * | Request                          | Body                    | Meaning          |
 * | -------------------------------- | ----------------------- | ---------------- |
 * | `GET    {url}`                   |                         | list all threads |
 * | `POST   {url}`                   | a `CommentThread`       | create a thread  |
 * | `POST   {url}/{id}/comments`     | a `Comment`             | add a reply      |
 * | `PATCH  {url}/{id}`              | `{ resolved: boolean }` | resolve / reopen |
 * | `DELETE {url}/{id}`              |                         | delete a thread  |
 *
 * `GET` must answer with a JSON array of threads. Changes are applied locally
 * right away and rolled back if the request fails. Other people's changes
 * show up when {@link RestCommentsAdapter.refresh} is called.
 */
export function restCommentsAdapter(options: RestCommentsOptions): RestCommentsAdapter {
  const local = memoryCommentsAdapter();
  const send = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const base = options.url.replace(/\/$/, "");

  async function request(path: string, method: string, body?: unknown): Promise<Response> {
    const extra = typeof options.headers === "function" ? options.headers() : options.headers;
    const response = await send(`${base}${path}`, {
      method,
      headers: { ...(body !== undefined && { "Content-Type": "application/json" }), ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok)
      throw new Error(`Comments request failed: ${method} ${path} (${response.status})`);
    return response;
  }

  const replaceAll = (threads: CommentThread[]) => {
    local.getThreads().forEach((thread) => void local.deleteThread(thread.id));
    threads.forEach((thread) => void local.createThread(thread));
  };

  /** Applies a change locally, sends it, and restores the previous state on failure. */
  async function optimistic(apply: () => void, path: string, method: string, body?: unknown) {
    const before = local.getThreads();
    apply();
    try {
      await request(path, method, body);
    } catch (error) {
      replaceAll(before);
      throw error;
    }
  }

  const refresh = async () => {
    const response = await request("", "GET");
    const threads: unknown = await response.json();
    if (!Array.isArray(threads)) throw new Error("Comments request failed: expected a JSON array.");
    replaceAll(threads as CommentThread[]);
  };
  const ready = refresh();
  // Reported again to whoever awaits `ready`; this only avoids an unhandled rejection.
  ready.catch(() => {});

  const id = encodeURIComponent;
  return {
    getThreads: local.getThreads,
    subscribe: local.subscribe,
    createThread: (thread) => optimistic(() => void local.createThread(thread), "", "POST", thread),
    addComment: (threadId, comment) =>
      optimistic(
        () => void local.addComment(threadId, comment),
        `/${id(threadId)}/comments`,
        "POST",
        comment,
      ),
    setResolved: (threadId, resolved) =>
      optimistic(() => void local.setResolved(threadId, resolved), `/${id(threadId)}`, "PATCH", {
        resolved,
      }),
    deleteThread: (threadId) =>
      optimistic(() => void local.deleteThread(threadId), `/${id(threadId)}`, "DELETE"),
    refresh,
    ready,
  };
}

/** A REST-backed adapter, with a way to reload. */
export interface RestCommentsAdapter extends CommentsAdapter {
  /** Reloads all threads from the server. */
  refresh: () => Promise<void>;
  /** Settles when the first load has finished. */
  ready: Promise<void>;
}
