import {
  children,
  hasMark,
  markAttrs,
  textOf,
  toJSON,
  type DocNode,
  type ExportSource,
} from "./source";

/*
 * Marks in the order they are opened. Links go outermost so a link with mixed
 * formatting inside stays one link.
 */
const MARKS: Array<{
  name: string;
  open: (node: DocNode) => string;
  close: (node: DocNode) => string;
}> = [
  {
    name: "link",
    open: () => "[",
    close: (node) => {
      const attrs = markAttrs(node, "link") ?? {};
      const href = String(attrs.href ?? "").replace(/[()\s]/g, encodeURIComponent);
      return `](${href})`;
    },
  },
  { name: "bold", open: () => "**", close: () => "**" },
  { name: "italic", open: () => "*", close: () => "*" },
  { name: "strike", open: () => "~~", close: () => "~~" },
  // Markdown has no syntax for these two, so they are written as inline HTML.
  { name: "underline", open: () => "<u>", close: () => "</u>" },
  { name: "highlight", open: () => "<mark>", close: () => "</mark>" },
];

function escapeText(text: string): string {
  return text.replace(/([\\`*_[\]~<])/g, "\\$1");
}

/** Escapes characters that would start a block if they began a line. */
function escapeLineStart(line: string): string {
  return (
    line
      .replace(/^(\s*)(#{1,6}\s|>|[-+]\s)/, "$1\\$2")
      // A digit cannot be escaped, so the dot after it is: "1\. text".
      .replace(/^(\s*\d+)([.)]\s)/, "$1\\$2")
  );
}

function serializeInline(nodes: DocNode[]): string {
  let out = "";
  // Marks currently open, with the node that opened them (needed to close links).
  const open: Array<{ mark: (typeof MARKS)[number]; node: DocNode }> = [];
  // Trailing spaces are written after closing markers: "**bold** " not "**bold **".
  let pendingSpace = "";

  const closeDownTo = (depth: number) => {
    while (open.length > depth) {
      const { mark, node } = open.pop()!;
      out += mark.close(node);
    }
  };

  for (const node of nodes) {
    if (node.type === "hardBreak") {
      closeDownTo(0);
      out += `${pendingSpace.trimEnd()}\\\n`;
      pendingSpace = "";
      continue;
    }
    if (node.type === "image") {
      closeDownTo(0);
      out += pendingSpace + image(node);
      pendingSpace = "";
      continue;
    }
    if (node.type !== "text") {
      closeDownTo(0);
      out += pendingSpace + escapeText(textOf(node));
      pendingSpace = "";
      continue;
    }

    const text = node.text ?? "";
    const wanted = MARKS.filter((mark) => hasMark(node, mark.name));
    // Keep the marks that are already open in the same order; close the rest.
    let keep = 0;
    while (
      keep < open.length &&
      keep < wanted.length &&
      open[keep]!.mark === wanted[keep] &&
      (wanted[keep]!.name !== "link" ||
        markAttrs(open[keep]!.node, "link")?.href === markAttrs(node, "link")?.href)
    ) {
      keep++;
    }
    closeDownTo(keep);

    const lead = /^\s*/.exec(text)![0];
    const trail = lead.length === text.length ? "" : /\s*$/.exec(text)![0];
    const core = text.slice(lead.length, text.length - trail.length);
    out += pendingSpace + lead;
    pendingSpace = "";
    if (!core) continue;

    for (const mark of wanted.slice(keep)) {
      out += mark.open(node);
      open.push({ mark, node });
    }
    if (hasMark(node, "code")) {
      // Use a longer fence when the code itself contains backticks.
      const fence = "`".repeat(
        Math.max(0, ...(core.match(/`+/g) ?? []).map((run) => run.length)) + 1,
      );
      const pad = core.startsWith("`") || core.endsWith("`") ? " " : "";
      out += `${fence}${pad}${core}${pad}${fence}`;
    } else {
      out += escapeText(core);
    }
    pendingSpace = trail;
  }
  closeDownTo(0);
  return out + pendingSpace;
}

function image(node: DocNode): string {
  const { src = "", alt = "", title } = (node.attrs ?? {}) as Record<string, string | undefined>;
  const label = String(alt ?? "").replace(/[[\]]/g, "\\$&");
  const suffix = title ? ` "${String(title).replace(/"/g, '\\"')}"` : "";
  return `![${label}](${String(src).replace(/[()\s]/g, encodeURIComponent)}${suffix})`;
}

const indent = (text: string, prefix: string) =>
  text
    .split("\n")
    .map((line, index) => (index === 0 || !line ? line : prefix + line))
    .join("\n");

function serializeList(node: DocNode): string {
  const start = Number(node.attrs?.start ?? 1);
  return children(node)
    .map((item, index) => {
      const marker =
        node.type === "orderedList"
          ? `${start + index}. `
          : node.type === "taskList"
            ? `- [${item.attrs?.checked ? "x" : " "}] `
            : "- ";
      // Continuation lines line up under the item's text.
      const pad = " ".repeat(node.type === "taskList" ? 2 : marker.length);
      const body = children(item)
        .map((child) => serializeBlock(child))
        .join(children(item).every((child) => child.type !== "paragraph") ? "\n" : "\n\n")
        // A nested list sits tight under its paragraph.
        .replace(/\n\n(?=(?:- |\d+\. ))/g, "\n");
      return marker + indent(body, pad);
    })
    .join("\n");
}

function serializeTable(node: DocNode): string {
  const rows = children(node).map((row) =>
    children(row).map((cell) =>
      children(cell)
        .map((block) => serializeInline(children(block)))
        .join("<br>")
        .replace(/\|/g, "\\|")
        .replace(/\n/g, " "),
    ),
  );
  if (!rows.length) return "";
  const width = Math.max(...rows.map((row) => row.length));
  const line = (cells: string[]) =>
    `| ${Array.from({ length: width }, (_unused, index) => cells[index] ?? "").join(" | ")} |`;
  const [header, ...body] = rows;
  return [line(header!), line(Array.from({ length: width }, () => "---")), ...body.map(line)].join(
    "\n",
  );
}

function serializeBlock(node: DocNode): string {
  switch (node.type) {
    case "paragraph":
      return serializeInline(children(node)).split("\n").map(escapeLineStart).join("\n");
    case "heading":
      return `${"#".repeat(Number(node.attrs?.level ?? 1))} ${serializeInline(children(node))}`;
    case "bulletList":
    case "orderedList":
    case "taskList":
      return serializeList(node);
    case "blockquote":
      return serializeBlocks(children(node))
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n");
    case "codeBlock": {
      const code = textOf(node);
      const fence = "`".repeat(
        Math.max(3, ...(code.match(/`{3,}/g) ?? []).map((run) => run.length + 1)),
      );
      return `${fence}${String(node.attrs?.language ?? "")}\n${code}\n${fence}`;
    }
    case "horizontalRule":
      return "---";
    case "table":
      return serializeTable(node);
    case "image":
      return image(node);
    default:
      // Unknown containers (callouts, columns, ...) keep their content.
      return children(node).some((child) => child.type === "text")
        ? serializeInline(children(node))
        : serializeBlocks(children(node));
  }
}

function serializeBlocks(nodes: DocNode[]): string {
  return nodes
    .map(serializeBlock)
    .filter((block) => block !== "")
    .join("\n\n");
}

/**
 * Converts a document to Markdown (CommonMark with GitHub tables, task lists
 * and strikethrough).
 *
 * Markdown cannot express everything: text alignment, image sizes and merged
 * table cells are dropped, and underline and highlight are written as inline
 * HTML (`<u>`, `<mark>`).
 */
export function toMarkdown(source: ExportSource): string {
  const markdown = serializeBlocks(children(toJSON(source)));
  return markdown ? `${markdown}\n` : "";
}
