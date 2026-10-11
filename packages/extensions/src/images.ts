import {
  defineExtension,
  getEditor,
  registerFeature,
  type OpenEditExtension,
  type OpenEditor,
} from "@openedit/core";
import { Extension } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";

declare module "@openedit/core" {
  interface FeatureRegistry {
    images: true;
  }
}

/**
 * Options for the {@link images} feature.
 */
export interface ImagesOptions {
  /**
   * Stores a file and resolves to the URL to use as the image `src`.
   * By default the file is embedded in the document as a data URL, which
   * needs no server but makes documents large. Supply your own for real use.
   */
  upload?: (file: File) => Promise<string>;
  /** Largest accepted file, in bytes. @defaultValue 10 MB */
  maxFileSize?: number;
  /** Called when a file is rejected or its upload fails. */
  onError?: (error: Error, file: File) => void;
}

interface ImageUploadStorage {
  upload: (file: File) => Promise<string>;
  maxFileSize: number;
  onError: (error: Error, file: File) => void;
}

const STORAGE_NAME = "imageUpload";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function imageFilesFrom(list: FileList | null | undefined): File[] {
  return Array.from(list ?? []).filter((file) => file.type.startsWith("image/"));
}

function storageOf(editor: OpenEditor): ImageUploadStorage | null {
  const storage = editor.engine.storage as unknown as Record<string, unknown>;
  return (storage[STORAGE_NAME] as ImageUploadStorage | undefined) ?? null;
}

/**
 * Uploads image files with the configured `upload` function and inserts them
 * into the document. Files that are not images or are too large are reported
 * through `onError` and skipped.
 *
 * @param position - Document position to insert at. Defaults to the selection.
 * @returns The number of images inserted.
 */
export async function insertImageFiles(
  editor: OpenEditor,
  files: File[],
  position?: number,
): Promise<number> {
  const storage = storageOf(editor);
  if (!storage) {
    throw new Error('insertImageFiles: the "images" feature is not enabled on this editor.');
  }
  let inserted = 0;
  for (const file of files) {
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error(`"${file.name}" is not an image.`);
      }
      if (file.size > storage.maxFileSize) {
        throw new Error(`"${file.name}" is larger than the allowed size.`);
      }
      const src = await storage.upload(file);
      if (editor.isDestroyed) return inserted;
      const image = { type: "image", attrs: { src, alt: file.name } };
      const chain = editor.chain();
      // Later files go after the ones before them, at the moved selection.
      if (position === undefined || inserted > 0) chain.insertContent(image);
      else chain.insertContentAt(position, image);
      chain.run();
      inserted++;
    } catch (error) {
      storage.onError(error instanceof Error ? error : new Error(String(error)), file);
    }
  }
  return inserted;
}

/**
 * Opens the browser's file picker and inserts the chosen images.
 */
export function pickImageFiles(editor: OpenEditor): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.onchange = () => {
    void insertImageFiles(editor, Array.from(input.files ?? []));
  };
  input.click();
}

/**
 * Images: insert by file picker, paste or drag-and-drop, and resize by
 * dragging the handles.
 */
export function images(options: ImagesOptions = {}): OpenEditExtension {
  return defineExtension({
    name: "images",
    engine: () => [
      Image.configure({
        allowBase64: true,
        resize: { enabled: true, minWidth: 64, minHeight: 32, alwaysPreserveAspectRatio: true },
      }),
      Extension.create<object, ImageUploadStorage>({
        name: STORAGE_NAME,
        addStorage: () => ({
          upload: options.upload ?? readAsDataUrl,
          maxFileSize: options.maxFileSize ?? 10 * 1024 * 1024,
          onError: options.onError ?? ((error) => console.error(error)),
        }),
        addProseMirrorPlugins() {
          const engine = this.editor;
          return [
            new Plugin({
              key: new PluginKey("openeditImageUpload"),
              props: {
                handlePaste(_view, event) {
                  const files = imageFilesFrom(event.clipboardData?.files);
                  const editor = getEditor(engine);
                  if (!files.length || !editor) return false;
                  event.preventDefault();
                  void insertImageFiles(editor, files);
                  return true;
                },
                handleDrop(view, event, _slice, moved) {
                  const files = imageFilesFrom(event.dataTransfer?.files);
                  const editor = getEditor(engine);
                  if (moved || !files.length || !editor) return false;
                  event.preventDefault();
                  const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
                  void insertImageFiles(editor, files, at?.pos);
                  return true;
                },
              },
            }),
          ];
        },
      }),
    ],
  });
}

registerFeature("images", () => images());
