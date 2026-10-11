import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/tables.ts", "src/images.ts", "src/slash-menu.ts", "src/collab.ts"],
  format: ["esm", "cjs"],
  dts: {
    // Carries the engine's command typings (insertTable, setImage, ...) to
    // consumers. The dts bundler drops these imports when they are in the source.
    banner: [
      "@tiptap/extension-table",
      "@tiptap/extension-image",
      "@tiptap/extension-collaboration",
    ]
      .map((name) => `import "${name}";`)
      .join("\n"),
  },
  sourcemap: true,
  // Keep dist in watch mode: the playground dev server reads it while we rebuild.
  clean: !options.watch,
  treeshake: true,
}));
