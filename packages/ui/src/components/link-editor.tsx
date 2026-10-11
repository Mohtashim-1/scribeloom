import type { OpenEditor } from "@openedit/core";
import { useEditorContext, useEditorState } from "@openedit/react";
import { CornerDownLeft, ExternalLink, Link as LinkIcon, Trash2 } from "lucide-react";
import { Popover, Tooltip } from "radix-ui";
import { useState } from "react";
import { applyLink, getLinkHref, normalizeUrl, removeLink } from "../lib/link";
import { cx } from "../lib/cx";
import { BarButton, panelClass } from "./bar";

const iconButtonClass =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-oe-muted outline-none " +
  "hover:bg-oe-hover hover:text-oe-fg focus-visible:outline-2 focus-visible:outline-solid " +
  "focus-visible:outline-oe-accent disabled:opacity-35 disabled:hover:bg-transparent";

/**
 * Props for {@link LinkEditor}.
 */
export interface LinkEditorProps {
  editor: OpenEditor;
  /** Called after the link was applied or removed, or editing was cancelled. */
  onDone?: () => void;
  /** Focus the URL field when it appears. @defaultValue `true` */
  autoFocus?: boolean;
}

/**
 * A URL field with apply, open and remove buttons, for the link at the
 * selection. Enter applies, Escape cancels.
 */
export function LinkEditor({ editor, onDone, autoFocus = true }: LinkEditorProps) {
  const current = getLinkHref(editor);
  const [url, setUrl] = useState(current);
  const [invalid, setInvalid] = useState(false);
  const target = normalizeUrl(url);

  const apply = () => {
    if (applyLink(editor, url)) onDone?.();
    else setInvalid(true);
  };

  return (
    <form
      className="flex items-center gap-0.5"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          editor.focus();
          onDone?.();
        }
      }}
    >
      <input
        type="text"
        inputMode="url"
        autoFocus={autoFocus}
        value={url}
        placeholder="Paste or type a link"
        aria-label="Link URL"
        aria-invalid={invalid}
        onChange={(event) => {
          setUrl(event.target.value);
          setInvalid(false);
        }}
        className={cx(
          "h-7 w-56 min-w-0 rounded-md border border-transparent bg-transparent px-2 text-[13px] text-oe-fg outline-none",
          "placeholder:text-oe-faint focus:border-oe-border-strong",
          invalid && "border-red-500 focus:border-red-500",
        )}
      />
      <button type="submit" aria-label="Apply link" title="Apply link" className={iconButtonClass}>
        <CornerDownLeft size={15} aria-hidden="true" />
      </button>
      <span className="mx-0.5 h-4 w-px shrink-0 bg-oe-border" aria-hidden="true" />
      <button
        type="button"
        aria-label="Open link in a new tab"
        title="Open link in a new tab"
        className={iconButtonClass}
        disabled={!target}
        onClick={() => target && window.open(target, "_blank", "noopener,noreferrer")}
      >
        <ExternalLink size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Remove link"
        title="Remove link"
        className={iconButtonClass}
        disabled={!current}
        onClick={() => {
          removeLink(editor);
          onDone?.();
        }}
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </form>
  );
}

/**
 * Toolbar button that opens a {@link LinkEditor} in a popover.
 */
export function LinkButton({ editor }: { editor: OpenEditor }) {
  const { root } = useEditorContext();
  const [open, setOpen] = useState(false);
  const state = useEditorState(editor, (e) => ({
    available: e.has("link"),
    active: e.isActive("link"),
    enabled: e.isEditable && (!e.isSelectionEmpty || e.isActive("link")),
  }));
  if (!state?.available) return null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <BarButton label="Link" active={state.active} disabled={!state.enabled}>
          <LinkIcon size={16} aria-hidden="true" />
        </BarButton>
      </Popover.Trigger>
      <Popover.Portal container={root}>
        <Popover.Content
          sideOffset={6}
          className={cx(panelClass, "p-1")}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {/* The link editor's plain buttons sit outside a Bar, so give them a tooltip scope. */}
          <Tooltip.Provider>
            <LinkEditor editor={editor} onDone={() => setOpen(false)} />
          </Tooltip.Provider>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
