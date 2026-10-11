// Copies the UI package's source into ./registry, which ships with the CLI.
// `openedit add` hands these files to users, so they are the real components,
// not a second copy to keep in sync.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "../../ui/src");
const target = join(here, "../registry");

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(source, target, {
  recursive: true,
  filter: (path) => !/\.test\.tsx?$/.test(path),
});
