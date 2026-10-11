/**
 * Saves content as a file in the browser.
 *
 * @param type - MIME type, used when `content` is a string or bytes.
 */
export function download(
  content: Blob | string | Uint8Array,
  filename: string,
  type = "text/plain",
): void {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content as BlobPart], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Revoke after the click has been handled.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
