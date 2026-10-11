import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: {
    // Carries the engine's command typings (toggleBold, undo, ...) to
    // consumers, who would otherwise only see them after importing the engine
    // themselves. The dts bundler drops this import when it is in the source.
    banner: [
      "@tiptap/starter-kit",
      "@tiptap/extension-highlight",
      "@tiptap/extension-text-align",
      "@tiptap/extension-list",
    ]
      .map((name) => `import "${name}";`)
      .join("\n"),
  },
  sourcemap: true,
  // Keep dist in watch mode: the playground dev server reads it while we rebuild.
  clean: !options.watch,
  treeshake: true,
}));
