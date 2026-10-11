import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
  type IRunOptions,
  type ParagraphChild,
} from "docx";
import { readImageInfo } from "./image-size";
import {
  children,
  hasMark,
  markAttrs,
  textOf,
  toJSON,
  type DocNode,
  type ExportSource,
} from "./source";

/**
 * Options for {@link toDocx}.
 */
export interface DocxOptions {
  /** Document title, stored in the file's properties. */
  title?: string;
  /**
   * Loads an image that is not embedded as a data URL. By default it is
   * fetched, which needs the image's server to allow it (CORS).
   */
  loadImage?: (src: string) => Promise<Uint8Array | null>;
}

const MAX_IMAGE_WIDTH = 600;
const MONO = "Consolas";
const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];
const ALIGNMENTS: Record<string, IParagraphOptions["alignment"]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

async function defaultLoadImage(src: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(src);
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

function decodeDataUrl(src: string): Uint8Array | null {
  const match = /^data:[^;,]*(;base64)?,(.*)$/s.exec(src);
  if (!match) return null;
  if (!match[1]) return new TextEncoder().encode(decodeURIComponent(match[2]!));
  const binary = atob(match[2]!);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

interface Context {
  images: Map<string, Uint8Array | null>;
  /** One numbering instance per ordered list, so each restarts at 1. */
  orderedLists: number;
}

function runOptions(node: DocNode): IRunOptions {
  const code = hasMark(node, "code");
  return {
    bold: hasMark(node, "bold") || undefined,
    italics: hasMark(node, "italic") || undefined,
    strike: hasMark(node, "strike") || undefined,
    underline: hasMark(node, "underline") ? {} : undefined,
    highlight: hasMark(node, "highlight") ? "yellow" : undefined,
    // A named style, so the code survives a trip through Word and back.
    style: code ? "InlineCode" : undefined,
  };
}

function imageRun(node: DocNode, context: Context): ParagraphChild {
  const src = String(node.attrs?.src ?? "");
  const bytes = context.images.get(src);
  const info = bytes ? readImageInfo(bytes) : null;
  if (!bytes || !info) {
    // Word cannot embed this one (missing, blocked, or a format such as SVG).
    return new TextRun({
      text: `[image: ${String(node.attrs?.alt || src || "unavailable")}]`,
      italics: true,
    });
  }
  const wanted = Number(node.attrs?.width) || info.width;
  const width = Math.min(wanted, MAX_IMAGE_WIDTH);
  return new ImageRun({
    type: info.kind,
    data: bytes,
    transformation: { width, height: Math.round((width / info.width) * info.height) },
    altText: {
      name: "",
      title: String(node.attrs?.alt ?? ""),
      description: String(node.attrs?.alt ?? ""),
    },
  });
}

function inline(nodes: DocNode[], context: Context, base: IRunOptions = {}): ParagraphChild[] {
  return nodes.flatMap((node): ParagraphChild[] => {
    if (node.type === "hardBreak") return [new TextRun({ break: 1 })];
    if (node.type === "image") return [imageRun(node, context)];
    const text = node.type === "text" ? (node.text ?? "") : textOf(node);
    if (!text) return [];
    const options = { ...base, ...runOptions(node) };
    const href = markAttrs(node, "link")?.href;
    if (typeof href === "string" && href) {
      return [
        new ExternalHyperlink({
          link: href,
          children: [new TextRun({ ...options, text, style: "Hyperlink" })],
        }),
      ];
    }
    return [new TextRun({ ...options, text })];
  });
}

type Block = Paragraph | Table;

function list(node: DocNode, context: Context, level: number): Block[] {
  const instance = node.type === "orderedList" ? ++context.orderedLists : 0;
  return children(node).flatMap((item) =>
    children(item).flatMap((child, index): Block[] => {
      if (["bulletList", "orderedList", "taskList"].includes(child.type ?? "")) {
        return list(child, context, level + 1);
      }
      if (child.type !== "paragraph") return blocks([child], context);
      const runs = inline(children(child), context);
      // Only an item's first paragraph carries the bullet or number.
      if (index > 0)
        return [new Paragraph({ children: runs, indent: { left: 720 * (level + 1) } })];
      if (node.type === "taskList") {
        return [
          new Paragraph({
            children: [new TextRun(item.attrs?.checked ? "☑ " : "☐ "), ...runs],
            indent: { left: 360 * (level + 1) },
          }),
        ];
      }
      return [
        new Paragraph({
          children: runs,
          ...(node.type === "orderedList"
            ? { numbering: { reference: "ordered", level, instance } }
            : { bullet: { level } }),
        }),
      ];
    }),
  );
}

function table(node: DocNode, context: Context): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: children(node).map(
      (row) =>
        new TableRow({
          // Marks a header row, which Word repeats on each page.
          tableHeader: children(row).every((cell) => cell.type === "tableHeader") || undefined,
          children: children(row).map((cell) => {
            const header = cell.type === "tableHeader";
            const content = blocks(children(cell), context, header ? { bold: true } : {});
            return new TableCell({
              children: content.length ? content : [new Paragraph("")],
              columnSpan: Number(cell.attrs?.colspan) > 1 ? Number(cell.attrs?.colspan) : undefined,
              rowSpan: Number(cell.attrs?.rowspan) > 1 ? Number(cell.attrs?.rowspan) : undefined,
              shading: header
                ? { type: ShadingType.CLEAR, fill: "F0F0F3", color: "auto" }
                : undefined,
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
            });
          }),
        }),
    ),
  });
}

function blocks(nodes: DocNode[], context: Context, base: IRunOptions = {}): Block[] {
  return nodes.flatMap((node): Block[] => {
    switch (node.type) {
      case "paragraph":
        return [
          new Paragraph({
            children: inline(children(node), context, base),
            alignment: ALIGNMENTS[String(node.attrs?.textAlign)],
            spacing: { after: 160 },
          }),
        ];
      case "heading":
        return [
          new Paragraph({
            children: inline(children(node), context, base),
            heading: HEADINGS[Number(node.attrs?.level ?? 1) - 1] ?? HeadingLevel.HEADING_1,
            alignment: ALIGNMENTS[String(node.attrs?.textAlign)],
          }),
        ];
      case "bulletList":
      case "orderedList":
      case "taskList":
        return list(node, context, 0);
      case "blockquote":
        return children(node).flatMap((child) =>
          child.type === "paragraph"
            ? [new Paragraph({ children: inline(children(child), context, base), style: "Quote" })]
            : blocks([child], context, base),
        );
      case "codeBlock":
        return textOf(node)
          .split("\n")
          .map((line) => new Paragraph({ children: [new TextRun(line)], style: "CodeBlock" }));
      case "horizontalRule":
        return [new Paragraph({ style: "HorizontalRule" })];
      case "table":
        return [table(node, context)];
      case "image":
        return [new Paragraph({ children: [imageRun(node, context)] })];
      default:
        // Unknown containers (callouts, columns, ...) keep their content.
        return children(node).some((child) => child.type === "text")
          ? [new Paragraph({ children: inline(children(node), context, base) })]
          : blocks(children(node), context, base);
    }
  });
}

function collectImages(node: DocNode, found = new Set<string>()): Set<string> {
  if (node.type === "image" && node.attrs?.src) found.add(String(node.attrs.src));
  children(node).forEach((child) => collectImages(child, found));
  return found;
}

/**
 * Builds a Word document (`.docx`) from the editor content, and returns its
 * bytes. Runs in the browser and in Node; nothing is sent to a server.
 *
 * Carried over: headings, paragraphs and alignment, inline formatting, links,
 * bullet / numbered / task lists (nested), quotes, code blocks, dividers,
 * tables (with merged cells) and PNG / JPEG / GIF / BMP images. Images in
 * other formats, or that cannot be loaded, become a text placeholder.
 *
 * @example
 * ```ts
 * download(await toDocx(editor), "document.docx", DOCX_MIME_TYPE);
 * ```
 */
export async function toDocx(source: ExportSource, options: DocxOptions = {}): Promise<Uint8Array> {
  const doc = toJSON(source);
  const load = options.loadImage ?? defaultLoadImage;
  const images = new Map<string, Uint8Array | null>();
  await Promise.all(
    [...collectImages(doc)].map(async (src) => {
      images.set(src, decodeDataUrl(src) ?? (await load(src)));
    }),
  );
  const context: Context = { images, orderedLists: 0 };
  const body = blocks(children(doc), context);

  const file = new Document({
    title: options.title,
    creator: "OpenEdit",
    // Named styles carry meaning Word has no element for. The importer in
    // @openedit/import maps the same names back.
    styles: {
      characterStyles: [
        {
          id: "InlineCode",
          name: "Inline Code",
          run: { font: MONO, shading: { type: ShadingType.CLEAR, fill: "F0F0F3", color: "auto" } },
        },
      ],
      paragraphStyles: [
        {
          id: "Quote",
          name: "Quote",
          basedOn: "Normal",
          run: { italics: true },
          paragraph: {
            indent: { left: 480 },
            spacing: { after: 160 },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: "444444", space: 12 } },
          },
        },
        {
          id: "CodeBlock",
          name: "Code Block",
          basedOn: "Normal",
          run: { font: MONO, size: 20 },
          paragraph: { shading: { type: ShadingType.CLEAR, fill: "F3F3F5", color: "auto" } },
        },
        {
          id: "HorizontalRule",
          name: "Horizontal Rule",
          basedOn: "Normal",
          paragraph: {
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "BBBBBB", space: 1 } },
          },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "ordered",
          levels: [0, 1, 2, 3, 4, 5].map((level) => ({
            level,
            format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][
              level % 3
            ]!,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{ children: body.length ? body : [new Paragraph("")] }],
  });
  return new Uint8Array(await Packer.toArrayBuffer(file));
}

/** MIME type of `.docx` files, for downloads. */
export const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
