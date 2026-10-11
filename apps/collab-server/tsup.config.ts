import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  entry: ["src/index.ts", "src/main.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  dts: { entry: "src/index.ts" },
  sourcemap: true,
  clean: !options.watch,
}));
