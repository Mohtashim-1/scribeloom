/** Raster formats Word can embed directly. */
export type ImageKind = "png" | "jpg" | "gif" | "bmp";

export interface ImageInfo {
  kind: ImageKind;
  width: number;
  height: number;
}

/**
 * Reads the format and pixel size from the first bytes of an image, without
 * decoding it. Returns `null` for formats Word cannot embed (SVG, WebP, ...).
 */
export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // PNG: signature, then the IHDR chunk holds width and height.
  if (bytes.length > 24 && view.getUint32(0) === 0x89504e47) {
    return { kind: "png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  // GIF: "GIF8", then little-endian size.
  if (bytes.length > 10 && view.getUint32(0) === 0x47494638) {
    return { kind: "gif", width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  // BMP: "BM", size in the DIB header.
  if (bytes.length > 26 && view.getUint16(0) === 0x424d) {
    return {
      kind: "bmp",
      width: view.getInt32(18, true),
      height: Math.abs(view.getInt32(22, true)),
    };
  }
  // JPEG: walk the segments to the start-of-frame marker.
  if (bytes.length > 4 && view.getUint16(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      const marker = bytes[offset + 1]!;
      const isStartOfFrame =
        marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isStartOfFrame) {
        return {
          kind: "jpg",
          height: view.getUint16(offset + 5),
          width: view.getUint16(offset + 7),
        };
      }
      offset += 2 + view.getUint16(offset + 2);
    }
  }
  return null;
}
