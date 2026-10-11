import type { AnyExtension } from "@tiptap/core";

/**
 * Input for {@link defineExtension}.
 */
export interface ExtensionDefinition {
  /** Unique name. Two extensions with the same name are treated as the same feature. */
  name: string;
  /**
   * Returns the engine-level (TipTap) extensions this extension contributes.
   * Called once per editor, so it is safe to create fresh instances here.
   */
  engine: () => AnyExtension | AnyExtension[];
}

/**
 * An OpenEdit extension. Opaque on purpose: app code passes these around
 * without touching the underlying engine.
 */
export interface OpenEditExtension {
  readonly name: string;
  /** @internal Resolves the engine extensions for one editor instance. */
  readonly resolve: () => AnyExtension[];
}

/**
 * Defines an OpenEdit extension.
 *
 * @example
 * ```ts
 * import { Highlight } from "@tiptap/extension-highlight";
 *
 * const highlight = defineExtension({
 *   name: "highlight",
 *   engine: () => Highlight.configure({ multicolor: true }),
 * });
 *
 * createEditor({ features: ["basics", highlight] });
 * ```
 */
export function defineExtension(definition: ExtensionDefinition): OpenEditExtension {
  const { name, engine } = definition;
  if (!name) {
    throw new Error("defineExtension: `name` is required.");
  }
  return Object.freeze({
    name,
    resolve: () => {
      const result = engine();
      return Array.isArray(result) ? result : [result];
    },
  });
}
