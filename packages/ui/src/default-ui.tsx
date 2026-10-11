// Importing the package registers the "tables", "images" and "slash-menu" features.
import "@openedit/extensions";
import type { EditorOptions } from "@openedit/core";
import { Editor, type EditorProps, type EditorUI } from "@openedit/react";
import { BubbleMenu } from "./components/bubble-menu";
import { ImageMenu } from "./components/image-menu";
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
export const DefaultUI: Required<EditorUI> = {
  Toolbar,
  BubbleMenu,
  SlashMenu,
  TableMenu,
  ImageMenu,
};

/** The features the default UI has controls for. */
export const defaultFeatures: NonNullable<EditorOptions["features"]> = [
  "basics",
  "tables",
  "images",
  "slash-menu",
];

/**
 * The batteries-included editor: `<Editor>` with {@link defaultFeatures} and
 * {@link DefaultUI}. Pass `ui` to override individual slots, or set one to
 * `undefined` to remove it.
 *
 * @example
 * ```tsx
 * import { RichTextEditor } from "@openedit/ui";
 * import "@openedit/ui/styles.css";
 *
 * <RichTextEditor content="<p>Hello</p>" />
 * ```
 */
export function RichTextEditor({ ui, features = defaultFeatures, ...props }: EditorProps) {
  return <Editor features={features} ui={{ ...DefaultUI, ...ui }} {...props} />;
}
