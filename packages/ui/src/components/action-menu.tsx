import type { OpenEditor } from "@openedit/core";
import { useEditorContext, useEditorState } from "@openedit/react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { EditorAction } from "../actions";
import { cx } from "../lib/cx";
import { BarButton, panelClass } from "./bar";

/**
 * Props for {@link ActionMenu}.
 */
export interface ActionMenuProps {
  editor: OpenEditor;
  /** Accessible name and tooltip of the trigger button. */
  label: string;
  /** Icon shown on the trigger while none of the actions is active. */
  icon: LucideIcon;
  actions: EditorAction[];
}

/**
 * A dropdown of related actions, such as heading levels or list types. The
 * trigger shows the icon of whichever action is active.
 */
export function ActionMenu({ editor, label, icon, actions }: ActionMenuProps) {
  const { root } = useEditorContext();
  const available = actions.filter((action) => !action.requires || editor.has(action.requires));
  const activeId = useEditorState(
    editor,
    (e) => available.find((action) => action.isActive?.(e))?.id ?? null,
  );
  const editable = useEditorState(editor, (e) => e.isEditable) ?? false;
  if (!available.length) return null;
  const active = available.find((action) => action.id === activeId);
  const TriggerIcon = active?.icon ?? icon;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <BarButton label={label} active={!!active} disabled={!editable}>
          <TriggerIcon size={16} aria-hidden="true" />
          <ChevronDown size={12} aria-hidden="true" className="opacity-70" />
        </BarButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={root}>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className={cx(panelClass, "min-w-[176px] p-1")}
          // Focus goes back to the document when an item runs, not to the trigger.
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {available.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenu.Item
                key={action.id}
                onSelect={() => action.run(editor)}
                className="flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-[13px] leading-none outline-none select-none data-[highlighted]:bg-oe-hover"
              >
                <Icon size={16} aria-hidden="true" className="text-oe-muted" />
                <span className="flex-1">{action.label}</span>
                {action.id === activeId && (
                  <Check size={14} aria-hidden="true" className="text-oe-accent" />
                )}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
