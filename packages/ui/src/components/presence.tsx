import type { OpenEditor } from "@openedit/core";
import type { CollabStatus } from "@openedit/extensions";
import { useCollab } from "../hooks";
import { cx } from "../lib/cx";

const statusLabels: Record<CollabStatus, string | null> = {
  connected: null,
  connecting: "Connecting…",
  disconnected: "Offline",
  local: null,
};

function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const letters =
    words.length > 1 ? words[0]![0]! + words[words.length - 1]![0]! : name.slice(0, 2);
  return letters.toUpperCase();
}

/**
 * Props for {@link Presence}.
 */
export interface PresenceProps {
  editor: OpenEditor;
  /** How many people to show before collapsing the rest into "+n". @defaultValue `4` */
  max?: number;
}

/**
 * Who is in the document: an avatar per person in their cursor colour, plus
 * the connection state when it is not connected. Renders nothing unless the
 * `collab` feature is on.
 */
export function Presence({ editor, max = 4 }: PresenceProps) {
  const { collab, state } = useCollab(editor);
  if (!collab) return null;
  const shown = state.peers.slice(0, max);
  const hidden = state.peers.length - shown.length;
  const status = statusLabels[state.status];
  const names = state.peers.map((peer) => (peer.isSelf ? `${peer.name} (you)` : peer.name));

  return (
    <div
      role="group"
      aria-label={`In this document: ${names.join(", ") || "nobody"}`}
      className="flex shrink-0 items-center gap-2 font-oe"
    >
      {status && (
        <span role="status" className="flex items-center gap-1.5 text-[12px] text-oe-muted">
          <span
            aria-hidden="true"
            className={cx(
              "size-1.5 rounded-full",
              state.status === "connecting" ? "bg-amber-500" : "bg-oe-faint",
            )}
          />
          {status}
        </span>
      )}
      <span className="flex items-center">
        {shown.map((peer, index) => (
          <span
            key={peer.clientId}
            title={peer.isSelf ? `${peer.name} (you)` : peer.name}
            aria-hidden="true"
            style={{ backgroundColor: peer.color, zIndex: shown.length - index }}
            className={cx(
              "relative flex size-6 items-center justify-center rounded-full text-[10px] leading-none font-semibold text-white ring-2 ring-oe-bg select-none",
              index > 0 && "-ml-1",
            )}
          >
            {initials(peer.name)}
          </span>
        ))}
        {hidden > 0 && (
          <span className="relative -ml-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-oe-hover px-1 text-[10px] leading-none font-semibold text-oe-muted ring-2 ring-oe-bg">
            +{hidden}
          </span>
        )}
      </span>
    </div>
  );
}
