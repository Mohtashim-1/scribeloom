import type { EditorUIProps } from "@openedit/react";
import { Check, Trash2 } from "lucide-react";
import { useAnchoredPosition, useMath } from "../hooks";
import { cx } from "../lib/cx";
import { panelClass } from "./bar";

const iconButton =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-oe-muted outline-none " +
  "hover:bg-oe-hover hover:text-oe-fg focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-oe-accent";

/**
 * The editor for a formula: click a formula in the document and type LaTeX,
 * which renders as you type. Enter or Escape finishes. Needs the `math`
 * feature.
 */
export function MathMenu({ editor }: EditorUIProps) {
  const { math, state } = useMath(editor);
  const editing = state.editing;
  const position = useAnchoredPosition({
    editor,
    open: !!editing,
    getRect: () => math?.getRect() ?? null,
    placement: "bottom",
    updateKey: editing?.pos,
  });
  if (!math || !editing) return null;

  const finish = () => {
    math.close();
    editor.focus();
  };
  return (
    <form
      ref={position.setFloating}
      style={position.style}
      role="dialog"
      aria-label="Edit formula"
      className={cx(panelClass, "flex items-center gap-0.5 p-1")}
      onSubmit={(event) => {
        event.preventDefault();
        finish();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          finish();
        }
      }}
    >
      <input
        // Remount per formula, so the field shows the one that was clicked.
        key={editing.pos}
        autoFocus
        aria-label="LaTeX"
        placeholder="LaTeX, e.g. \frac{a}{b}"
        defaultValue={editing.latex}
        spellCheck={false}
        onChange={(event) => event.target.value.trim() && math.update(event.target.value)}
        className="h-7 w-72 min-w-0 rounded-md border border-transparent bg-transparent px-2 font-oe-mono text-[13px] text-oe-fg outline-none placeholder:text-oe-faint focus:border-oe-border-strong"
      />
      <button type="submit" aria-label="Done" title="Done" className={iconButton}>
        <Check size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Delete formula"
        title="Delete formula"
        className={iconButton}
        onClick={() => {
          math.update("");
          editor.focus();
        }}
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </form>
  );
}
