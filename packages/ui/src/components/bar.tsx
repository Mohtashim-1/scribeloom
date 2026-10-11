import { useEditorContext } from "@openedit/react";
import type { OpenEditor } from "@openedit/core";
import { Toolbar as RadixToolbar, Tooltip } from "radix-ui";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import type { EditorAction } from "../actions";
import { useActionState } from "../hooks";
import { cx } from "../lib/cx";
import { formatShortcut } from "../lib/shortcut";

/** Class names for a floating panel (bubble menu, popovers, dropdowns). */
export const panelClass =
  "z-50 rounded-[10px] border border-oe-border bg-oe-surface text-oe-fg shadow-oe font-oe";

const buttonClass =
  "inline-flex h-7 min-w-7 shrink-0 items-center justify-center gap-0.5 rounded-md px-1 " +
  "text-oe-muted outline-none transition-colors select-none " +
  "hover:bg-oe-hover hover:text-oe-fg " +
  "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-oe-accent " +
  "disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-oe-muted " +
  "data-[active=true]:bg-oe-active data-[active=true]:text-oe-accent " +
  "data-[state=open]:bg-oe-hover data-[state=open]:text-oe-fg";

/**
 * A row of buttons with toolbar semantics: one tab stop, arrow keys to move
 * between buttons, Escape to return to the document. The fixed toolbar and every floating menu are built on it.
 */
export const Bar = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadixToolbar.Root>>(
  function Bar({ className, children, onKeyDown, ...props }, ref) {
    const { editor } = useEditorContext();
    return (
      <Tooltip.Provider delayDuration={350} skipDelayDuration={200}>
        <RadixToolbar.Root
          ref={ref}
          className={cx("flex items-center gap-0.5 font-oe", className)}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            // Escape on one of the bar's own buttons hands focus back to the
            // document. Escape inside an open menu arrives here too (menus are
            // React children rendered elsewhere), but that one only closes the menu.
            if (event.key === "Escape" && event.currentTarget.contains(event.target as Node)) {
              event.preventDefault();
              editor?.focus();
            }
          }}
          {...props}
        >
          {children}
        </RadixToolbar.Root>
      </Tooltip.Provider>
    );
  },
);

/** A thin vertical divider between groups of buttons in a {@link Bar}. */
export function BarSeparator() {
  return <RadixToolbar.Separator className="mx-1 h-4 w-px shrink-0 bg-oe-border" />;
}

/**
 * Props for {@link BarButton}.
 */
export interface BarButtonProps extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  /** Accessible name, also shown as the tooltip. */
  label: string;
  /** Keyboard shortcut to show in the tooltip, e.g. `"Mod+B"`. */
  shortcut?: string;
  /** Whether the button shows as pressed. Omit for buttons that are not toggles. */
  active?: boolean;
  children: ReactNode;
}

/**
 * An icon button for a {@link Bar}, with a tooltip. It does not take focus on
 * click, so the editor keeps its selection.
 */
export const BarButton = forwardRef<HTMLButtonElement, BarButtonProps>(function BarButton(
  { label, shortcut, active, className, children, onMouseDown, ...props },
  ref,
) {
  const { root } = useEditorContext();
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <RadixToolbar.Button
          ref={ref}
          type="button"
          aria-label={label}
          aria-pressed={active}
          data-active={active ? "true" : undefined}
          className={cx(buttonClass, className)}
          onMouseDown={(event) => {
            event.preventDefault();
            onMouseDown?.(event);
          }}
          {...props}
        >
          {children}
        </RadixToolbar.Button>
      </Tooltip.Trigger>
      <Tooltip.Portal container={root}>
        <Tooltip.Content
          sideOffset={6}
          className="z-[60] flex items-center gap-1.5 rounded-md bg-oe-fg px-2 py-1 font-oe text-[12px] leading-4 text-oe-bg"
        >
          {label}
          {shortcut && <span className="opacity-60">{formatShortcut(shortcut)}</span>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
});

/**
 * Props for {@link ActionButton}.
 */
export interface ActionButtonProps {
  editor: OpenEditor;
  action: EditorAction;
}

/**
 * A {@link BarButton} wired to an {@link EditorAction}: shows its icon,
 * pressed and disabled state, and runs it on click. Renders nothing if the
 * editor lacks the extension the action needs.
 */
export function ActionButton({ editor, action }: ActionButtonProps) {
  const state = useActionState(editor, action);
  if (!state.available) return null;
  const Icon = action.icon;
  return (
    <BarButton
      label={action.label}
      shortcut={action.shortcut}
      active={action.isActive ? state.active : undefined}
      disabled={!state.enabled}
      onClick={() => action.run(editor)}
    >
      <Icon size={16} aria-hidden="true" />
    </BarButton>
  );
}
