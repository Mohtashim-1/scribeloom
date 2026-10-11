import type { DocumentJSON, OpenEditor } from "@openedit/core";

/** What the exporters accept: a live editor, or a document as JSON. */
export type ExportSource = OpenEditor | DocumentJSON;

/** A node of the document tree. */
export type DocNode = DocumentJSON;

export function toJSON(source: ExportSource): DocumentJSON {
  return "getJSON" in source && typeof source.getJSON === "function"
    ? source.getJSON()
    : (source as DocumentJSON);
}

export const children = (node: DocNode): DocNode[] => node.content ?? [];

export const hasMark = (node: DocNode, name: string) =>
  node.marks?.some((mark) => mark.type === name) ?? false;

export const markAttrs = (node: DocNode, name: string): Record<string, unknown> | undefined =>
  node.marks?.find((mark) => mark.type === name)?.attrs;

/** The plain text inside a node. */
export function textOf(node: DocNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return children(node).map(textOf).join("");
}
