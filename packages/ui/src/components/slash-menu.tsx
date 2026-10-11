import type { EditorUIProps } from "@openedit/react";
import {
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Sparkles,
  SquareCode,
  Table,
  TextQuote,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useEffect, useId, useRef } from "react";
import { useActiveDescendant, useAnchoredPosition, useSlashMenu } from "../hooks";
import { cx } from "../lib/cx";
import { panelClass } from "./bar";

/** Icons for the built-in slash menu items, by item id. */
const icons: Record<string, LucideIcon> = {
  paragraph: Pilcrow,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  bulletList: List,
  orderedList: ListOrdered,
  taskList: ListTodo,
  blockquote: TextQuote,
  codeBlock: SquareCode,
  horizontalRule: Minus,
  table: Table,
  image: ImagePlus,
};

/**
 * The `/` command menu. Type `/` in the document, keep typing to search, use
 * the arrow keys and Enter to pick. Needs the `slash-menu` feature.
 */
export function SlashMenu({ editor }: EditorUIProps) {
  const { menu, state } = useSlashMenu(editor);
  const selected = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const optionId = (index: number) => `${listId}-${index}`;
  useActiveDescendant(
    editor,
    state.open,
    listId,
    state.items.length ? optionId(state.selectedIndex) : undefined,
  );
  const position = useAnchoredPosition({
    editor,
    open: state.open,
    getRect: () => state.getRect?.() ?? null,
    placement: "bottom-start",
  });

  useEffect(() => {
    selected.current?.scrollIntoView?.({ block: "nearest" });
  }, [state.selectedIndex, state.items]);

  if (!menu || !state.open) return null;
  return (
    <div
      ref={position.setFloating}
      style={position.style}
      id={listId}
      role="listbox"
      aria-label="Insert block"
      className={cx(panelClass, "max-h-80 w-64 overflow-y-auto p-1")}
    >
      {state.items.length === 0 && (
        <div className="px-2 py-1.5 text-[13px] text-oe-muted">No results</div>
      )}
      {state.items.map((item, index) => {
        const Icon = icons[item.id] ?? Sparkles;
        const isSelected = index === state.selectedIndex;
        const startsGroup = item.group !== state.items[index - 1]?.group;
        return (
          <Fragment key={item.id}>
            {startsGroup && (
              <div className="px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide text-oe-muted uppercase">
                {item.group}
              </div>
            )}
            <button
              ref={isSelected ? selected : undefined}
              type="button"
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              tabIndex={-1}
              // Keep focus (and the typed query) in the document.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => menu.setSelectedIndex(index)}
              onClick={() => menu.select(item)}
              className={cx(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left",
                isSelected && "bg-oe-hover",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-oe-border bg-oe-bg text-oe-muted">
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] leading-[18px] text-oe-fg">
                  {item.title}
                </span>
                {item.description && (
                  <span className="block truncate text-[12px] leading-4 text-oe-muted">
                    {item.description}
                  </span>
                )}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
