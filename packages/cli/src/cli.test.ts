import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { add, list, report } from "./commands";
import { allFiles, closure, COMPONENTS, REGISTRY } from "./registry";

const projects: string[] = [];
afterEach(() =>
  projects.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })),
);

function project() {
  const path = mkdtempSync(join(tmpdir(), "openedit-cli-"));
  projects.push(path);
  return path;
}
const options = (cwd: string) => ({ cwd, dir: "src/components/openedit", overwrite: false });

describe("registry", () => {
  it("ships the real UI source, without tests", () => {
    const files = allFiles();
    expect(files).toContain("components/toolbar.tsx");
    expect(files.some((file) => file.includes(".test."))).toBe(false);
  });

  it("has a source file for every listed component", () => {
    for (const [name, { file }] of Object.entries(COMPONENTS)) {
      expect(existsSync(join(REGISTRY, file)), name).toBe(true);
    }
  });

  it("finds what a component needs, and which packages it imports", () => {
    const { files, packages } = closure(["components/toolbar.tsx"]);

    expect(files).toEqual(
      expect.arrayContaining([
        "components/toolbar.tsx",
        "components/bar.tsx",
        "actions.ts",
        "hooks.ts",
        "lib/cx.ts",
      ]),
    );
    expect(files).not.toContain("components/math-menu.tsx");
    expect(packages).toEqual(
      expect.arrayContaining(["@openedit/react", "lucide-react", "radix-ui"]),
    );
    expect(packages).not.toContain("react");
  });
});

describe("add", () => {
  it("copies a component with everything it imports, so nothing is left dangling", () => {
    const cwd = project();

    const result = add(["bubble-menu"], options(cwd));

    expect(result.skipped).toEqual([]);
    expect(result.written).toContain("src/components/openedit/components/bubble-menu.tsx");
    // Every relative import in the copied files points at another copied file.
    for (const file of result.written) {
      const path = join(cwd, file);
      const source = readFileSync(path, "utf8");
      for (const [, specifier] of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
        const base = join(dirname(path), specifier!);
        expect(
          [base, `${base}.ts`, `${base}.tsx`].some(existsSync),
          `${file} -> ${specifier}`,
        ).toBe(true);
      }
    }
  });

  it("does not replace existing files unless asked", () => {
    const cwd = project();
    const first = add(["bar"], options(cwd));
    const mine = join(cwd, first.written[0]!);
    writeFileSync(mine, "// my changes");

    const second = add(["bar"], options(cwd));
    expect(second.written).toEqual([]);
    expect(second.skipped).toEqual(first.written);
    expect(readFileSync(mine, "utf8")).toBe("// my changes");

    add(["bar"], { ...options(cwd), overwrite: true });
    expect(readFileSync(mine, "utf8")).not.toBe("// my changes");
  });

  it("refuses unknown components and folders outside the project", () => {
    const cwd = project();
    expect(() => add(["nope"], options(cwd))).toThrow(/Unknown component: nope/);
    expect(() => add(["bar"], { ...options(cwd), dir: "../elsewhere" })).toThrow(
      /inside the project/,
    );
  });

  it("copies the theme stylesheet", () => {
    const cwd = project();
    const result = add(["theme"], options(cwd));
    expect(result.written).toEqual(["src/components/openedit/styles.css"]);
    expect(readFileSync(join(cwd, result.written[0]!), "utf8")).toContain("--color-oe-accent");
  });

  it("explains what to do next", () => {
    const text = report(
      { written: ["a.tsx"], skipped: ["b.tsx"], packages: ["radix-ui"] },
      "src/ui",
    );
    expect(text).toContain("Copied 1 file:");
    expect(text).toContain("npm install radix-ui");
    expect(text).toContain('from "./ui/components/toolbar"');
  });

  it("lists every component", () => {
    expect(list().split("\n")).toHaveLength(Object.keys(COMPONENTS).length);
  });
});

describe("the built command", () => {
  const bin = join(dirname(REGISTRY), "dist/cli.js");

  it.skipIf(!existsSync(bin))("runs end to end", () => {
    const cwd = project();
    const output = execFileSync("node", [bin, "add", "presence", "--cwd", cwd, "--dir", "ui"], {
      encoding: "utf8",
    });

    expect(output).toContain("+ ui/components/presence.tsx");
    expect(existsSync(join(cwd, "ui/components/presence.tsx"))).toBe(true);
    expect(execFileSync("node", [bin, "list"], { encoding: "utf8" })).toContain("toolbar");
  });

  it.skipIf(!existsSync(bin))("exits with an error for bad input", () => {
    expect(() => execFileSync("node", [bin, "add", "nope"], { stdio: "pipe" })).toThrow();
  });
});
