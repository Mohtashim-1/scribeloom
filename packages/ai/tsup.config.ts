import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  // Keep dist in watch mode: the playground dev server reads it while we rebuild.
  clean: !options.watch,
  treeshake: true,
}));
