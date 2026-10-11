import { basics } from "./basics";
import type { OpenEditExtension } from "./define-extension";
import type { EditorOptions } from "./types";

/**
 * Map of feature names that can be passed to `createEditor({ features })` as
 * strings. Packages that add a feature extend it through declaration merging:
 *
 * ```ts
 * declare module "@openedit/core" {
 *   interface FeatureRegistry {
 *     tables: true;
 *   }
 * }
 * ```
 */
export interface FeatureRegistry {
  basics: true;
}

/** A feature name registered in {@link FeatureRegistry}. */
export type FeatureName = keyof FeatureRegistry;

/** Builds a feature's extension from the options the editor was created with. */
export type FeatureFactory = (options: EditorOptions) => OpenEditExtension;

const registry = new Map<string, FeatureFactory>([
  [
    "basics",
    (options) =>
      basics({
        placeholder: options.placeholder,
        // A collaborative document has its own, per-user undo history.
        history: !hasFeature(options, "collab"),
      }),
  ],
]);

/**
 * Whether the options enable a feature, by name or as an extension object.
 */
export function hasFeature(options: EditorOptions, name: string): boolean {
  return (options.features ?? ["basics"]).some(
    (feature) => (typeof feature === "string" ? feature : feature.name) === name,
  );
}

/**
 * Registers a feature so it can be enabled by name. Feature packages call this
 * when imported, which keeps unused features out of the bundle.
 */
export function registerFeature(name: string, factory: FeatureFactory): void {
  registry.set(name, factory);
}

/**
 * Turns the `features` option into a de-duplicated list of extensions.
 * The first occurrence of a name wins.
 *
 * @throws If a feature name has not been registered.
 */
export function resolveFeatures(options: EditorOptions): OpenEditExtension[] {
  const resolved = new Map<string, OpenEditExtension>();
  for (const feature of options.features ?? ["basics"]) {
    let extension: OpenEditExtension;
    if (typeof feature === "string") {
      const factory = registry.get(feature);
      if (!factory) {
        throw new Error(
          `Unknown feature "${feature}". Import the package that provides it, or pass an extension created with defineExtension().`,
        );
      }
      extension = factory(options);
    } else {
      extension = feature;
    }
    if (!resolved.has(extension.name)) {
      resolved.set(extension.name, extension);
    }
  }
  return [...resolved.values()];
}
