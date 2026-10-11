// Reports the gzipped size of what a user's bundler would ship for a few
// typical imports. Run after `pnpm build`:  node scripts/bundle-size.mjs
//
// React is left out of the totals: the host app already has it.
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const BUDGET_KB = 150;
const cases = [
  {
    name: "Base editor (core + React bindings, basics only)",
    code: `import { Editor } from "@openedit/react"; console.log(Editor);`,
    budget: true,
  },
  {
    name: "Core only, no framework",
    code: `import { createEditor } from "@openedit/core"; console.log(createEditor);`,
  },
  {
    name: "Default UI (RichTextEditor with its default features)",
    code: `import { RichTextEditor } from "@openedit/ui"; console.log(RichTextEditor);`,
  },
  {
    name: "  + collaboration",
    code: `import { RichTextEditor } from "@openedit/ui"; import "@openedit/extensions/collab"; console.log(RichTextEditor);`,
  },
];

let failed = false;
for (const { name, code, budget } of cases) {
  const result = await build({
    stdin: {
      contents: code,
      resolveDir: new URL("../apps/playground", import.meta.url).pathname,
      loader: "js",
    },
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    write: false,
    external: ["react", "react-dom", "react/jsx-runtime"],
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
  });
  const kb = gzipSync(result.outputFiles[0].contents).length / 1024;
  const verdict = budget
    ? kb <= BUDGET_KB
      ? `  within the ${BUDGET_KB} KB budget`
      : `  OVER the ${BUDGET_KB} KB budget`
    : "";
  if (budget && kb > BUDGET_KB) failed = true;
  console.log(`${kb.toFixed(1).padStart(7)} KB gzipped  ${name}${verdict}`);
}
process.exitCode = failed ? 1 : 0;
