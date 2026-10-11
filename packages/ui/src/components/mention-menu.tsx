import type { EditorUIProps } from "@openedit/react";
import { useEffect, useId, useRef } from "react";
import { useActiveDescendant, useAnchoredPosition, useMentions } from "../hooks";
import { cx } from "../lib/cx";
import { panelClass } from "./bar";

/**
 * The menu of people shown while typing an `@` mention. Arrow keys and Enter
 * pick. Needs the `mentions` feature.
 */
export function MentionMenu({ editor }: EditorUIProps) {
  const { mentions, state } = useMentions(editor);
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

  if (!mentions || !state.open) return null;
  return (
    <div
      ref={position.setFloating}
      style={position.style}
      id={listId}
      role="listbox"
      aria-label="Mention someone"
      aria-busy={state.loading}
      className={cx(panelClass, "max-h-64 w-60 overflow-y-auto p-1")}
    >
      {state.items.length === 0 && (
        <div className="px-2 py-1.5 text-[13px] text-oe-muted">
          {state.loading ? "Searching…" : "No one found"}
        </div>
      )}
      {state.items.map((item, index) => {
        const isSelected = index === state.selectedIndex;
        return (
          <button
            key={item.id}
            ref={isSelected ? selected : undefined}
            type="button"
            id={optionId(index)}
            role="option"
            aria-selected={isSelected}
            tabIndex={-1}
            // Keep focus (and the typed query) in the document.
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => mentions.setSelectedIndex(index)}
            onClick={() => mentions.select(item)}
            className={cx(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
              isSelected && "bg-oe-hover",
            )}
          >
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-oe-active text-[11px] font-semibold text-oe-accent"
            >
              {item.label.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] leading-[18px] text-oe-fg">
                {item.label}
              </span>
              {item.description && (
                <span className="block truncate text-[12px] leading-4 text-oe-muted">
                  {item.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
