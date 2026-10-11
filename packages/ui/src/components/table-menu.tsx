import type { OpenEditor } from "@openedit/core";
import type { EditorUIProps } from "@openedit/react";
import { useEditorState } from "@openedit/react";
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Columns3,
  PanelTop,
  Rows3,
  TableCellsMerge,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useAnchoredPosition, useFocusWithin } from "../hooks";
import { cx } from "../lib/cx";
import { Bar, BarButton, BarSeparator, panelClass } from "./bar";

interface TableCommand {
  label: string;
  icon: LucideIcon;
  /** Shows the icon struck through, for the "delete" variants. */
  destructive?: boolean;
  run: (editor: OpenEditor) => boolean;
  can: (editor: OpenEditor) => boolean;
}

const groups: TableCommand[][] = [
  [
    {
      label: "Insert column left",
      icon: BetweenVerticalStart,
      run: (e) => e.chain().focus().addColumnBefore().run(),
      can: (e) => e.can().addColumnBefore(),
    },
    {
      label: "Insert column right",
      icon: BetweenVerticalEnd,
      run: (e) => e.chain().focus().addColumnAfter().run(),
      can: (e) => e.can().addColumnAfter(),
    },
    {
      label: "Delete column",
      icon: Columns3,
      destructive: true,
      run: (e) => e.chain().focus().deleteColumn().run(),
      can: (e) => e.can().deleteColumn(),
    },
  ],
  [
    {
      label: "Insert row above",
      icon: BetweenHorizontalStart,
      run: (e) => e.chain().focus().addRowBefore().run(),
      can: (e) => e.can().addRowBefore(),
    },
    {
      label: "Insert row below",
      icon: BetweenHorizontalEnd,
      run: (e) => e.chain().focus().addRowAfter().run(),
      can: (e) => e.can().addRowAfter(),
    },
    {
      label: "Delete row",
      icon: Rows3,
      destructive: true,
      run: (e) => e.chain().focus().deleteRow().run(),
      can: (e) => e.can().deleteRow(),
    },
  ],
  [
    {
      label: "Toggle header row",
      icon: PanelTop,
      run: (e) => e.chain().focus().toggleHeaderRow().run(),
      can: (e) => e.can().toggleHeaderRow(),
    },
    {
      label: "Merge or split cells",
      icon: TableCellsMerge,
      run: (e) => e.chain().focus().mergeOrSplit().run(),
      can: (e) => e.can().mergeOrSplit(),
    },
  ],
  [
    {
      label: "Delete table",
      icon: Trash2,
      run: (e) => e.chain().focus().deleteTable().run(),
      can: (e) => e.can().deleteTable(),
    },
  ],
];
const commands = groups.flat();

/**
 * Floating controls for the table around the cursor: insert and delete rows
 * and columns, toggle the header row, merge or split cells, delete the table.
 * Needs the `tables` feature.
 */
export function TableMenu({ editor }: EditorUIProps) {
  const focus = useFocusWithin();
  const state = useEditorState(editor, (e) => {
    const inTable = e.has("table") && e.isEditable && e.isActive("table");
    return {
      inTable,
      focused: e.isFocused,
      // One character per command, so the comparison between transactions is cheap.
      enabled: inTable ? commands.map((command) => (command.can(e) ? "1" : "0")).join("") : "",
    };
  });
  const open = !!state?.inTable && (state.focused || focus.focused);
  const position = useAnchoredPosition({
    editor,
    open,
    getRect: () => editor.getNodeRect("table"),
    // Right-aligned: the line above a table usually has text on the left.
    placement: "top-end",
  });

  if (!open || !state) return null;
  return (
    <Bar
      ref={position.setFloating}
      style={position.style}
      aria-label="Table"
      className={cx(panelClass, "p-1")}
      {...focus.props}
    >
      {groups.map((group, groupIndex) => (
        <span key={groupIndex} className="flex items-center gap-0.5">
          {groupIndex > 0 && <BarSeparator />}
          {group.map((command) => {
            const Icon = command.icon;
            return (
              <BarButton
                key={command.label}
                label={command.label}
                disabled={state.enabled[commands.indexOf(command)] !== "1"}
                onClick={() => command.run(editor)}
                className={command.destructive ? "relative" : undefined}
              >
                <Icon size={16} aria-hidden="true" />
                {command.destructive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 left-1/2 h-[1.5px] w-5 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current"
                  />
                )}
              </BarButton>
            );
          })}
        </span>
      ))}
    </Bar>
  );
}
