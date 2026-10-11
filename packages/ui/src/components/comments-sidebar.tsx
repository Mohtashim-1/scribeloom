import type { ThreadView, Suggestion } from "@openedit/extensions";
import type { EditorUIProps } from "@openedit/react";
import { Check, CheckCheck, RotateCcw, Trash2, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useComments, useSuggestions } from "../hooks";
import { cx } from "../lib/cx";

const smallButton =
  "inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-[12px] text-oe-muted " +
  "outline-none hover:bg-oe-hover hover:text-oe-fg focus-visible:outline-2 focus-visible:outline-solid " +
  "focus-visible:outline-oe-accent";
const cardClass =
  "rounded-[10px] border border-oe-border bg-oe-surface p-2.5 text-[13px] leading-5";

function formatTime(timestamp: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function Composer(props: {
  label: string;
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => void;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!body.trim()) return;
    props.onSubmit(body);
    setBody("");
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <textarea
        aria-label={props.label}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        rows={2}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
          if (event.key === "Escape") props.onCancel?.();
        }}
        className="w-full resize-none rounded-md border border-oe-border bg-oe-bg px-2 py-1.5 font-oe text-[13px] leading-5 text-oe-fg outline-none placeholder:text-oe-faint focus:border-oe-accent"
      />
      <div className="flex justify-end gap-1">
        {props.onCancel && (
          <button type="button" className={smallButton} onClick={props.onCancel}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!body.trim()}
          className="inline-flex h-6 items-center rounded-md bg-oe-accent px-2 text-[12px] font-medium text-oe-accent-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-solid focus-visible:outline-oe-accent disabled:opacity-40"
        >
          {props.submitLabel}
        </button>
      </div>
    </form>
  );
}

function Section(props: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={props.title} className="flex flex-col gap-2">
      <header className="flex h-6 items-center justify-between">
        <h2 className="m-0 text-[11px] font-semibold tracking-wide whitespace-nowrap text-oe-muted uppercase">
          {props.title}
        </h2>
        <span className="flex gap-0.5">{props.actions}</span>
      </header>
      {props.children}
    </section>
  );
}

function describe(suggestion: Suggestion): ReactNode {
  const quote = (text: string) => <q className="text-oe-fg">{text.trim() || "␣"}</q>;
  if (suggestion.inserted && suggestion.deleted) {
    return (
      <>
        Replace {quote(suggestion.deleted)} with {quote(suggestion.inserted)}
      </>
    );
  }
  return suggestion.inserted ? (
    <>Add {quote(suggestion.inserted)}</>
  ) : (
    <>Delete {quote(suggestion.deleted)}</>
  );
}

/**
 * The panel beside the document: pending suggestions with accept / reject,
 * and comment threads with replies and resolve. It only takes up space when
 * there is something to show. Needs the `comments` and / or `suggestions`
 * features.
 */
export function CommentsSidebar({ editor }: EditorUIProps) {
  const { comments, state } = useComments(editor);
  const { suggestions, state: suggesting } = useSuggestions(editor);
  const [showResolved, setShowResolved] = useState(false);
  const open = state.threads.filter((thread) => !thread.resolved);
  const resolved = state.threads.filter((thread) => thread.resolved);
  const pending = suggesting.suggestions;
  if (!state.drafting && !state.threads.length && !pending.length) return null;

  const renderThread = (thread: ThreadView) => {
    const active = thread.id === state.activeThreadId;
    return (
      <article
        key={thread.id}
        aria-label={`Comment on ${thread.quote || "deleted text"}`}
        aria-current={active || undefined}
        onClick={() => !active && comments?.setActive(thread.id, { scroll: true })}
        className={cx(cardClass, "flex flex-col gap-2", active && "border-oe-accent")}
      >
        <p className="m-0 truncate border-l-2 border-oe-border-strong pl-2 text-[12px] text-oe-muted">
          {thread.orphaned ? <em>The commented text was deleted</em> : thread.quote}
        </p>
        {thread.comments.map((comment) => (
          <div key={comment.id}>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-oe-fg">{comment.author.name}</span>
              <time className="text-[11px] text-oe-muted">{formatTime(comment.createdAt)}</time>
            </div>
            <p className="m-0 break-words whitespace-pre-wrap text-oe-fg">{comment.body}</p>
          </div>
        ))}
        {active && !thread.resolved && (
          <Composer
            label="Reply"
            placeholder="Reply…"
            submitLabel="Reply"
            onSubmit={(body) => comments?.reply(thread.id, body)}
          />
        )}
        <div className="flex justify-end gap-0.5">
          {thread.resolved ? (
            <button
              type="button"
              className={smallButton}
              onClick={() => comments?.reopen(thread.id)}
            >
              <RotateCcw size={13} aria-hidden="true" /> Reopen
            </button>
          ) : (
            <button
              type="button"
              className={smallButton}
              onClick={() => comments?.resolve(thread.id)}
            >
              <Check size={13} aria-hidden="true" /> Resolve
            </button>
          )}
          <button
            type="button"
            className={smallButton}
            aria-label="Delete thread"
            title="Delete thread"
            onClick={() => comments?.remove(thread.id)}
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </div>
      </article>
    );
  };

  return (
    <aside
      aria-label="Comments and suggestions"
      className="sticky top-12 flex max-h-[70vh] w-72 max-w-full shrink-0 flex-col gap-4 overflow-y-auto border-l border-oe-border p-3 font-oe"
    >
      {state.drafting && (
        <Section title="New comment">
          <div className={cardClass}>
            <Composer
              label="Comment"
              placeholder="Add a comment…"
              submitLabel="Comment"
              autoFocus
              onSubmit={(body) => comments?.addThread(body)}
              onCancel={() => {
                comments?.setDrafting(false);
                editor.focus();
              }}
            />
          </div>
        </Section>
      )}

      {pending.length > 0 && (
        <Section
          title={`Suggestions (${pending.length})`}
          actions={
            <>
              <button
                type="button"
                className={smallButton}
                onClick={() => suggestions?.acceptAll()}
              >
                <CheckCheck size={13} aria-hidden="true" /> Accept all
              </button>
              <button
                type="button"
                className={smallButton}
                onClick={() => suggestions?.rejectAll()}
              >
                Reject all
              </button>
            </>
          }
        >
          {pending.map((suggestion) => (
            <article
              key={suggestion.id}
              aria-label="Suggestion"
              className={cx(cardClass, "flex gap-2")}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-oe-fg">{suggestion.author || "Someone"}</div>
                <p className="m-0 break-words text-oe-muted">{describe(suggestion)}</p>
              </div>
              <button
                type="button"
                className={smallButton}
                aria-label="Accept suggestion"
                title="Accept"
                onClick={() => suggestions?.accept(suggestion.id)}
              >
                <Check size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={smallButton}
                aria-label="Reject suggestion"
                title="Reject"
                onClick={() => suggestions?.reject(suggestion.id)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </article>
          ))}
        </Section>
      )}

      {(open.length > 0 || resolved.length > 0) && (
        <Section
          title={`Comments (${open.length})`}
          actions={
            resolved.length > 0 && (
              <button
                type="button"
                className={smallButton}
                aria-pressed={showResolved}
                onClick={() => setShowResolved(!showResolved)}
              >
                {showResolved ? "Hide" : "Show"} resolved ({resolved.length})
              </button>
            )
          }
        >
          {open.map(renderThread)}
          {showResolved && resolved.map(renderThread)}
        </Section>
      )}
    </aside>
  );
}
