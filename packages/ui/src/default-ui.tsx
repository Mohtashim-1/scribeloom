/*
 * Registers, by name, the features the default UI enables or can switch on
 * from a prop. Each is imported on its own so that the heavy optional ones
 * (collaboration, math) stay out of the bundle until the app imports them.
 */
import "@openedit/ai";
import "@openedit/extensions/block-handle";
import "@openedit/extensions/blocks";
import "@openedit/extensions/comments";
import "@openedit/extensions/images";
import "@openedit/extensions/mentions";
import "@openedit/extensions/slash-menu";
import "@openedit/extensions/suggestions";
import "@openedit/extensions/tables";
import "@openedit/extensions/toggles";
import type { EditorOptions } from "@openedit/core";
import { Editor, type EditorProps, type EditorUI } from "@openedit/react";
import { AIPanel } from "./components/ai";
import { BlockHandle } from "./components/block-handle";
import { BubbleMenu } from "./components/bubble-menu";
import { CommentsSidebar } from "./components/comments-sidebar";
import { ImageMenu } from "./components/image-menu";
import { MathMenu } from "./components/math-menu";
import { MentionMenu } from "./components/mention-menu";
import { SlashMenu } from "./components/slash-menu";
import { TableMenu } from "./components/table-menu";
import { Toolbar } from "./components/toolbar";

/**
 * The default UI: every slot filled with the built-in component. Spread it to
 * replace individual parts (customization level 2):
 *
 * ```tsx
 * <Editor ui={{ ...DefaultUI, Toolbar: MyToolbar }} />
 * ```
 */
export const DefaultUI = {
  Toolbar,
  BubbleMenu,
  SlashMenu,
  TableMenu,
  ImageMenu,
  Sidebar: CommentsSidebar,
  AIPanel,
  BlockHandle,
  MentionMenu,
  MathMenu,
} satisfies EditorUI;

/** The features the default UI has controls for. */
export const defaultFeatures: NonNullable<EditorOptions["features"]> = [
  "basics",
  "tables",
  "images",
  "slash-menu",
  "comments",
  "suggestions",
  "callouts",
  "columns",
  "toggles",
  "block-handle",
];

/**
 * The batteries-included editor: `<Editor>` with {@link defaultFeatures} and
 * {@link DefaultUI}. Pass `ui` to override individual slots, or set one to
 * `undefined` to remove it. Giving `collab`, `ai` or `mentions` settings turns
 * those features on.
 *
 * Collaboration and math are heavier, so they are opt-in: import
 * `@openedit/extensions/collab` or `@openedit/extensions/math` once in your
 * app (and add `"math"` to `features`).
 *
 * @example
 * ```tsx
 * import { RichTextEditor } from "@openedit/ui";
 * import "@openedit/ui/styles.css";
 *
 * <RichTextEditor content="<p>Hello</p>" />
 * ```
 */
export function RichTextEditor({ ui, features, ...props }: EditorProps) {
  // Features that need settings switch on when their settings are given.
  const resolved = features ?? [
    ...defaultFeatures,
    ...(props.collab ? (["collab"] as const) : []),
    ...(props.ai ? (["ai"] as const) : []),
    ...(props.mentions ? (["mentions"] as const) : []),
  ];
  return <Editor features={resolved} ui={{ ...DefaultUI, ...ui }} {...props} />;
}
