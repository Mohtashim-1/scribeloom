import type { OpenEditor } from "@openedit/core";

/**
 * Cleans up a URL typed by a user so it is safe and usable as a link target.
 *
 * - `example.com` becomes `https://example.com`
 * - `someone@example.com` becomes `mailto:someone@example.com`
 * - `http:`, `https:`, `mailto:`, `tel:`, and relative `/path` or `#anchor`
 *   targets are kept
 * - anything else with a scheme (`javascript:`, `data:`, ...) is rejected
 *
 * @returns The cleaned URL, or `null` if it is empty or not allowed.
 */
export function normalizeUrl(input: string): string | null {
  const url = input.trim();
  // eslint-disable-next-line no-control-regex -- control characters are exactly what we reject
  if (!url || /[\s\u0000-\u001f]/.test(url)) return null;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(url)) return url;
  if (url.startsWith("/") || url.startsWith("#")) return url;
  // A scheme we do not allow. `host:8080` is not a scheme, hence the digit check.
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(url)) return null;
  if (/^[^@/]+@[^@/]+\.[^@/]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
}

/** The `href` of the link at the selection, or `""`. */
export function getLinkHref(editor: OpenEditor): string {
  const href = editor.getAttributes("link").href;
  return typeof href === "string" ? href : "";
}

/**
 * Sets the link on the selection (or on the whole link the cursor is in).
 *
 * @returns `false` if the URL was rejected by {@link normalizeUrl}.
 */
export function applyLink(editor: OpenEditor, input: string): boolean {
  const href = normalizeUrl(input);
  if (!href) return false;
  return editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
}

/** Removes the link at the selection. */
export function removeLink(editor: OpenEditor): boolean {
  return editor.chain().focus().extendMarkRange("link").unsetLink().run();
}
