import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  // Keep dist in watch mode: the playground dev server reads it while we
  // rebuild. Never clean here, because styles.css is built into dist separately.
  clean: false,
  treeshake: true,
  watch: options.watch,
}));
