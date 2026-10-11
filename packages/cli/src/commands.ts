import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { closure, COMPONENTS, REGISTRY } from "./registry";

export interface AddOptions {
  /** Project root. */
  cwd: string;
  /** Folder to copy into, relative to `cwd`. */
  dir: string;
  /** Replace files that already exist. */
  overwrite: boolean;
}

export interface AddResult {
  written: string[];
  /** Files left alone because they already exist. */
  skipped: string[];
  /** npm packages the copied files import. */
  packages: string[];
}

/** One line per component, for `openedit list`. */
export function list(): string {
  const width = Math.max(...Object.keys(COMPONENTS).map((name) => name.length));
  return Object.entries(COMPONENTS)
    .map(([name, { summary }]) => `  ${name.padEnd(width)}  ${summary}`)
    .join("\n");
}

/**
 * Copies components and what they depend on into the project.
 *
 * @throws If a name is not a known component, or `dir` points outside `cwd`.
 */
export function add(names: string[], options: AddOptions): AddResult {
  const unknown = names.filter((name) => !(name in COMPONENTS));
  if (unknown.length) {
    throw new Error(
      `Unknown component: ${unknown.join(", ")}. Run "openedit list" to see what is available.`,
    );
  }
  const root = resolve(options.cwd);
  const target = resolve(root, options.dir);
  // The folder comes from the command line; keep it inside the project.
  if (relative(root, target).startsWith("..")) {
    throw new Error(`--dir must be inside the project: ${options.dir}`);
  }

  const { files, packages } = closure(names.map((name) => COMPONENTS[name]!.file));
  const result: AddResult = { written: [], skipped: [], packages };
  for (const file of files) {
    const destination = join(target, file);
    const shown = relative(root, destination).split("\\").join("/");
    if (existsSync(destination) && !options.overwrite) {
      result.skipped.push(shown);
      continue;
    }
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, readFileSync(join(REGISTRY, file)));
    result.written.push(shown);
  }
  return result;
}

/** What `openedit add` prints when it is done. */
export function report(result: AddResult, dir: string): string {
  const lines: string[] = [];
  if (result.written.length) {
    lines.push(`Copied ${result.written.length} file${result.written.length === 1 ? "" : "s"}:`);
    lines.push(...result.written.map((file) => `  + ${file}`));
  }
  if (result.skipped.length) {
    lines.push(
      `Left ${result.skipped.length} existing file${result.skipped.length === 1 ? "" : "s"} alone (use --overwrite to replace):`,
    );
    lines.push(...result.skipped.map((file) => `  = ${file}`));
  }
  if (result.packages.length) {
    lines.push("", "These files import the following packages. Install any you are missing:");
    lines.push(`  npm install ${result.packages.join(" ")}`);
  }
  lines.push(
    "",
    "The components are styled with Tailwind CSS utilities that read the OpenEdit tokens.",
    `Run "openedit add theme" for the stylesheet that defines them, import it in your CSS,`,
    `and make sure Tailwind scans ${dir}.`,
    "",
    "Use a copied component through the ui prop, for example:",
    `  import { Toolbar } from "./${dir.replace(/^\.?\/?(src\/)?/, "")}/components/toolbar";`,
    "  <Editor ui={{ ...DefaultUI, Toolbar }} />",
  );
  return lines.join("\n");
}
