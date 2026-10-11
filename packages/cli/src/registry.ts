import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Where the bundled component source lives, next to the built CLI. */
export const REGISTRY = resolve(dirname(fileURLToPath(import.meta.url)), "../registry");

/** What can be added, and the file each one starts from. */
export const COMPONENTS: Record<string, { file: string; summary: string }> = {
  toolbar: { file: "components/toolbar.tsx", summary: "The fixed toolbar" },
  "bubble-menu": {
    file: "components/bubble-menu.tsx",
    summary: "Floating menu on a text selection",
  },
  "slash-menu": { file: "components/slash-menu.tsx", summary: "The / command menu" },
  "link-editor": { file: "components/link-editor.tsx", summary: "Link popover and its form" },
  "table-menu": {
    file: "components/table-menu.tsx",
    summary: "Controls for the table at the cursor",
  },
  "image-menu": { file: "components/image-menu.tsx", summary: "Controls for the selected image" },
  "comments-sidebar": {
    file: "components/comments-sidebar.tsx",
    summary: "Comments and suggestions panel",
  },
  presence: { file: "components/presence.tsx", summary: "Who is in the document" },
  ai: { file: "components/ai.tsx", summary: "AI menu and its accept / discard panel" },
  "block-handle": {
    file: "components/block-handle.tsx",
    summary: "Handle beside the hovered block",
  },
  "mention-menu": { file: "components/mention-menu.tsx", summary: "Menu for @ mentions" },
  "math-menu": { file: "components/math-menu.tsx", summary: "Formula editor" },
  bar: { file: "components/bar.tsx", summary: "Toolbar row, buttons and separator" },
  "default-ui": { file: "default-ui.tsx", summary: "Everything: the whole default UI" },
  theme: { file: "styles.css", summary: "Tailwind entry mapping the OpenEdit tokens to utilities" },
};

const IMPORT = /(?:import|export)\s[^"']*?from\s+["']([^"']+)["']|import\s+["']([^"']+)["']/g;

function importsOf(file: string): string[] {
  const source = readFileSync(join(REGISTRY, file), "utf8");
  return Array.from(source.matchAll(IMPORT), (match) => match[1] ?? match[2]!);
}

function resolveRelative(from: string, specifier: string): string | null {
  const base = join(dirname(from), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    const absolute = join(REGISTRY, candidate);
    if (existsSync(absolute) && statSync(absolute).isFile()) return candidate.split("\\").join("/");
  }
  return null;
}

/**
 * The files a component needs: itself and everything it imports from the
 * registry, plus the npm packages those files import.
 */
export function closure(entries: string[]): { files: string[]; packages: string[] } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const visit = (file: string) => {
    if (files.has(file)) return;
    files.add(file);
    if (!/\.tsx?$/.test(file)) return;
    for (const specifier of importsOf(file)) {
      if (specifier.startsWith(".")) {
        const target = resolveRelative(file, specifier);
        if (target) visit(target);
      } else if (specifier !== "react" && !specifier.startsWith("react/")) {
        // "@scope/name/sub" and "name/sub" both belong to one package.
        const parts = specifier.split("/");
        packages.add(specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!);
      }
    }
  };
  entries.forEach(visit);
  return { files: [...files].sort(), packages: [...packages].sort() };
}

/** Every file in the registry, relative to it. */
export function allFiles(directory = REGISTRY): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? allFiles(path) : [relative(REGISTRY, path).split("\\").join("/")];
  });
}
