import type { OpenEditor } from "@openedit/core";
import type { EditorUIProps } from "@openedit/react";
import { useEditorContext, useEditorState } from "@openedit/react";
import {
  ArrowUp,
  Check,
  ChevronRight,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { useAI, useAnchoredPosition } from "../hooks";
import { cx } from "../lib/cx";
import { BarButton, panelClass } from "./bar";

const itemClass =
  "flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[13px] leading-none outline-none select-none data-[highlighted]:bg-oe-hover";
const textButton =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] text-oe-fg outline-none " +
  "hover:bg-oe-hover focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-oe-accent";

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Portuguese",
  "Arabic",
  "Hindi",
  "Urdu",
  "Chinese",
  "Japanese",
];

/**
 * Bar button that opens the list of AI actions for the selection. Renders
 * nothing unless the `ai` feature is on.
 */
export function AIMenu({ editor }: { editor: OpenEditor }) {
  const { root } = useEditorContext();
  const { ai } = useAI(editor);
  const editable = useEditorState(editor, (e) => e.isEditable) ?? false;
  if (!ai) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <BarButton label="AI" disabled={!editable} className="text-oe-accent">
          <Sparkles size={16} aria-hidden="true" />
          <span className="pr-0.5 text-[13px] font-medium">AI</span>
        </BarButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={root}>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className={cx(panelClass, "min-w-[200px] p-1")}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {ai.actions.map((action) =>
            action.input === "language" ? (
              <DropdownMenu.Sub key={action.id}>
                <DropdownMenu.SubTrigger className={cx(itemClass, "data-[state=open]:bg-oe-hover")}>
                  <span className="flex-1">{action.label}</span>
                  <ChevronRight size={14} aria-hidden="true" className="text-oe-muted" />
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal container={root}>
                  <DropdownMenu.SubContent
                    sideOffset={4}
                    className={cx(panelClass, "min-w-[150px] p-1")}
                  >
                    {LANGUAGES.map((language) => (
                      <DropdownMenu.Item
                        key={language}
                        className={itemClass}
                        onSelect={() => ai.run(action.id, language)}
                      >
                        {language}
                      </DropdownMenu.Item>
                    ))}
                    <DropdownMenu.Item className={itemClass} onSelect={() => ai.run(action.id)}>
                      Other…
                    </DropdownMenu.Item>
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
            ) : (
              <DropdownMenu.Item
                key={action.id}
                className={itemClass}
                onSelect={() => ai.run(action.id)}
              >
                {action.label}
                {action.input && "…"}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * The floating panel that goes with an AI action: asks for an instruction
 * when one is needed, shows progress, then offers to accept, discard or try
 * again. The generated text itself appears in the document as a preview.
 * Needs the `ai` feature.
 */
export function AIPanel({ editor }: EditorUIProps) {
  const { ai, state } = useAI(editor);
  const [input, setInput] = useState("");
  const primary = useRef<HTMLButtonElement>(null);
  const open = !!ai && state.status !== "idle";
  const position = useAnchoredPosition({
    editor,
    open,
    getRect: () => ai?.getRect() ?? null,
    placement: "bottom-start",
  });
  const action = ai?.actions.find((candidate) => candidate.id === state.actionId);

  useEffect(() => {
    if (state.status === "asking") setInput("");
    // So Enter accepts and Escape discards, without reaching for the mouse.
    if (state.status === "done" || state.status === "error") primary.current?.focus();
  }, [state.status]);

  if (!open || !ai) return null;
  return (
    <div
      ref={position.setFloating}
      style={position.style}
      role="dialog"
      aria-label={action ? `AI: ${action.label}` : "AI"}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          ai.discard();
        }
      }}
      className={cx(panelClass, "flex max-w-[min(420px,calc(100vw-16px))] items-center gap-1 p-1")}
    >
      <Sparkles size={16} aria-hidden="true" className="mx-1.5 shrink-0 text-oe-accent" />

      {state.status === "asking" && (
        <form
          className="flex items-center gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (input.trim() && action) ai.run(action.id, input);
          }}
        >
          <input
            autoFocus
            aria-label={action?.input === "language" ? "Language" : "Instruction"}
            placeholder={
              action?.input === "language"
                ? "Language, e.g. Italian"
                : "Tell AI what to write or change…"
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
            className="h-7 w-64 min-w-0 rounded-md border border-transparent bg-transparent px-1 text-[13px] text-oe-fg outline-none placeholder:text-oe-faint"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!input.trim()}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-oe-accent text-oe-accent-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-solid focus-visible:outline-oe-accent disabled:opacity-40"
          >
            <ArrowUp size={15} aria-hidden="true" />
          </button>
        </form>
      )}

      {state.status === "streaming" && (
        <>
          <span role="status" className="flex items-center gap-1.5 pr-1 text-[13px] text-oe-muted">
            <LoaderCircle
              size={14}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
            Writing…
          </span>
          <button type="button" className={textButton} onClick={() => ai.stop()}>
            <Square size={12} aria-hidden="true" /> Stop
          </button>
        </>
      )}

      {state.status === "done" && (
        <>
          {!state.output.trim() && (
            <span role="status" className="pr-1 text-[13px] text-oe-muted">
              Nothing was generated.
            </span>
          )}
          {state.output.trim() && (
            <button ref={primary} type="button" className={textButton} onClick={() => ai.accept()}>
              <Check size={14} aria-hidden="true" /> Accept
            </button>
          )}
          <button
            ref={state.output.trim() ? undefined : primary}
            type="button"
            className={textButton}
            onClick={() => ai.discard()}
          >
            <X size={14} aria-hidden="true" /> Discard
          </button>
          <button type="button" className={textButton} onClick={() => ai.retry()}>
            <RotateCcw size={13} aria-hidden="true" /> Try again
          </button>
        </>
      )}

      {state.status === "error" && (
        <>
          <span role="alert" className="max-w-[260px] px-1 text-[13px] leading-[18px] text-oe-fg">
            {state.error}
          </span>
          <button ref={primary} type="button" className={textButton} onClick={() => ai.retry()}>
            <RotateCcw size={13} aria-hidden="true" /> Try again
          </button>
          <button
            type="button"
            className={textButton}
            aria-label="Close"
            onClick={() => ai.discard()}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
