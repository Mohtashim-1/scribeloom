import type { OpenEditor } from "@openedit/core";

/** Who is making a comment or suggestion. */
export interface Author {
  name: string;
  /** Hex colour for the avatar, e.g. `#3e63dd`. */
  color?: string;
}

/** Short random id, unique enough for threads and suggestions in one document. */
export function createId(): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return random.replace(/[^a-z0-9]/gi, "").slice(0, 16);
}

/**
 * The author to record: the given one, else the collaboration user, else "You".
 */
export function resolveAuthor(editor: OpenEditor, explicit?: Author): Author {
  if (explicit) return explicit;
  const storage = editor.engine.storage as unknown as { collab?: { user?: Author } };
  return storage.collab?.user ?? { name: "You" };
}
