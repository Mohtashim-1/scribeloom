import type { EditorUIProps } from "@openedit/react";
import { useEditorContext, useEditorState } from "@openedit/react";
import { ArrowDown, ArrowUp, ChevronRight, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { actions, type EditorAction } from "../actions";
import { useAnchoredPosition, useBlockHandle } from "../hooks";
import { cx } from "../lib/cx";
import { formatShortcut } from "../lib/shortcut";
import { panelClass } from "./bar";

const handleButton =
  "inline-flex h-6 w-5 items-center justify-center rounded text-oe-muted outline-none " +
  "hover:bg-oe-hover hover:text-oe-fg focus-visible:outline-2 focus-visible:outline-solid " +
  "focus-visible:outline-oe-accent data-[state=open]:bg-oe-hover data-[state=open]:text-oe-fg";
const itemClass =
  "flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[13px] leading-none outline-none select-none data-[highlighted]:bg-oe-hover";

const turnInto: EditorAction[] = [
  actions.paragraph,
  actions.heading1,
  actions.heading2,
  actions.heading3,
  actions.bulletList,
  actions.orderedList,
  actions.taskList,
  actions.blockquote,
  actions.codeBlock,
];

/**
 * The handle that appears beside the block under the pointer: a "+" to add a
 * block below, and a grip to drag the block elsewhere or open its menu (turn
 * into, duplicate, move, delete). Needs the `block-handle` feature.
 *
 * Without a pointer, Ctrl/Cmd + Shift + Up / Down moves the current block.
 */
export function BlockHandle({ editor }: EditorUIProps) {
  const { root } = useEditorContext();
  const { handle, state } = useBlockHandle(editor);
  const [menuOpen, setMenuOpen] = useState(false);
  const editable = useEditorState(editor, (e) => e.isEditable) ?? false;
  const open = !!handle && editable && state.pos !== null;
  const position = useAnchoredPosition({
    editor,
    open,
    getRect: () => handle?.getRect() ?? null,
    placement: "left-start",
    gap: 4,
    updateKey: state.pos,
  });
  if (!open || !handle) return null;

  const setMenu = (next: boolean) => {
    setMenuOpen(next);
    handle.setLocked(next);
  };
  const available = turnInto.filter((action) => !action.requires || editor.has(action.requires));

  return (
    <div
      ref={position.setFloating}
      style={position.style}
      className="z-20 flex items-center font-oe"
      onMouseEnter={() => handle.setLocked(true)}
      onMouseLeave={() => !menuOpen && handle.setLocked(false)}
    >
      <button
        type="button"
        aria-label="Add block below"
        title="Add block below"
        className={handleButton}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => handle.insertBelow()}
      >
        <Plus size={15} aria-hidden="true" />
      </button>
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenu}>
        {/*
          The trigger is a wrapper, so the menu is anchored here but does not
          open on press: pressing the grip must be free to start a drag.
        */}
        <DropdownMenu.Trigger asChild>
          <span className="inline-flex" data-state={undefined}>
            <button
              type="button"
              aria-label="Block actions. Drag to move."
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Drag to move, click for actions"
              draggable
              className={cx(
                handleButton,
                "cursor-grab active:cursor-grabbing",
                menuOpen && "bg-oe-hover text-oe-fg",
              )}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onClick={() => setMenu(!menuOpen)}
              onDragStart={(event) => {
                setMenu(false);
                handle.startDrag(event.nativeEvent);
              }}
              onDragEnd={() => handle.endDrag()}
            >
              <GripVertical size={15} aria-hidden="true" />
            </button>
          </span>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal container={root}>
          <DropdownMenu.Content
            side="bottom"
            align="start"
            sideOffset={4}
            className={cx(panelClass, "min-w-[190px] p-1")}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger className={cx(itemClass, "data-[state=open]:bg-oe-hover")}>
                <span className="flex-1">Turn into</span>
                <ChevronRight size={14} aria-hidden="true" className="text-oe-muted" />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal container={root}>
                <DropdownMenu.SubContent
                  sideOffset={4}
                  className={cx(panelClass, "min-w-[170px] p-1")}
                >
                  {available.map((action) => {
                    const Icon = action.icon;
                    return (
                      <DropdownMenu.Item
                        key={action.id}
                        className={itemClass}
                        onSelect={() => {
                          handle.select();
                          action.run(editor);
                        }}
                      >
                        <Icon size={16} aria-hidden="true" className="text-oe-muted" />
                        {action.label}
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
            <DropdownMenu.Item className={itemClass} onSelect={() => handle.duplicate()}>
              <Copy size={16} aria-hidden="true" className="text-oe-muted" />
              Duplicate
            </DropdownMenu.Item>
            <DropdownMenu.Item className={itemClass} onSelect={() => handle.move(-1)}>
              <ArrowUp size={16} aria-hidden="true" className="text-oe-muted" />
              <span className="flex-1">Move up</span>
              <span className="text-[11px] text-oe-muted">{formatShortcut("Mod+Shift+↑")}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Item className={itemClass} onSelect={() => handle.move(1)}>
              <ArrowDown size={16} aria-hidden="true" className="text-oe-muted" />
              <span className="flex-1">Move down</span>
              <span className="text-[11px] text-oe-muted">{formatShortcut("Mod+Shift+↓")}</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-oe-border" />
            <DropdownMenu.Item className={itemClass} onSelect={() => handle.remove()}>
              <Trash2 size={16} aria-hidden="true" className="text-oe-muted" />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
