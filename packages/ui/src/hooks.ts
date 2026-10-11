import type { OpenEditor } from "@openedit/core";
import {
  getCollab,
  getSlashMenu,
  type Collab,
  type CollabState,
  type SlashMenu,
  type SlashMenuState,
} from "@openedit/extensions";
import { useEditorState } from "@openedit/react";
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  type Placement,
} from "@floating-ui/react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
} from "react";
import type { EditorAction } from "./actions";

/**
 * Live state of an action for the current selection.
 */
export interface ActionState {
  /** Whether the editor has the extension the action needs. */
  available: boolean;
  active: boolean;
  enabled: boolean;
}

/**
 * Subscribes to an action's state. Re-renders only when it changes.
 */
export function useActionState(editor: OpenEditor, action: EditorAction): ActionState {
  // Packed into a number so the comparison between transactions is trivial.
  const bits =
    useEditorState(editor, (e) => {
      const available = !action.requires || e.has(action.requires);
      if (!available) return 0;
      const active = action.isActive?.(e) ?? false;
      // Commands cannot be probed until the editor is mounted.
      const enabled = e.isEditable && e.isMounted && (action.isEnabled?.(e) ?? true);
      return 1 | (active ? 2 : 0) | (enabled ? 4 : 0);
    }) ?? 0;
  return { available: (bits & 1) !== 0, active: (bits & 2) !== 0, enabled: (bits & 4) !== 0 };
}

/**
 * Positions a floating element next to a rectangle in the document (the
 * selection, a table, ...), and keeps it there while the document changes or
 * the page scrolls.
 *
 * @returns `setFloating`, a ref for the floating element, and its `style`.
 */
export function useAnchoredPosition(options: {
  editor: OpenEditor;
  open: boolean;
  getRect: () => DOMRect | null;
  placement?: Placement;
}): { setFloating: (element: HTMLElement | null) => void; style: CSSProperties } {
  const { editor, open, placement = "top" } = options;
  const getRect = useRef(options.getRect);
  getRect.current = options.getRect;

  const { refs, floatingStyles, update, isPositioned } = useFloating({
    open,
    placement,
    strategy: "fixed",
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  useLayoutEffect(() => {
    const floating = refs.floating.current;
    if (!open || !floating) return;
    const anchor = {
      getBoundingClientRect: () => getRect.current() ?? new DOMRect(),
      contextElement: editor.element ?? undefined,
    };
    refs.setReference(anchor);
    const stopAutoUpdate = autoUpdate(anchor, floating, update);
    const stopListening = editor.on("transaction", update);
    return () => {
      stopAutoUpdate();
      stopListening();
    };
  }, [open, editor, refs, update]);

  return {
    setFloating: refs.setFloating,
    style: { ...floatingStyles, visibility: isPositioned ? "visible" : "hidden" },
  };
}

/**
 * Tracks whether keyboard focus is inside an element. Spread `props` onto it.
 * Floating menus use this to stay open while the user tabs through them, when
 * the editor itself has lost focus.
 */
export function useFocusWithin(): {
  focused: boolean;
  props: { onFocus: () => void; onBlur: (event: FocusEvent<HTMLElement>) => void };
} {
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }, []);
  return { focused, props: { onFocus, onBlur } };
}

/**
 * Whether the user is in the middle of selecting with the pointer. The bubble
 * menu waits for the selection to finish before it appears.
 */
export function useIsSelecting(editor: OpenEditor): boolean {
  const [selecting, setSelecting] = useState(false);
  const element = useEditorState(editor, (e) => e.element);
  useEffect(() => {
    if (!element) return;
    const start = () => setSelecting(true);
    const end = () => setSelecting(false);
    element.addEventListener("pointerdown", start);
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
    return () => {
      element.removeEventListener("pointerdown", start);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
    };
  }, [element]);
  return selecting;
}

const NO_MENU_STATE: SlashMenuState = {
  open: false,
  query: "",
  items: [],
  selectedIndex: 0,
  getRect: null,
};
const noSubscription = () => () => {};
const getNoMenuState = () => NO_MENU_STATE;

/**
 * Subscribes to the editor's slash menu.
 *
 * @returns `menu` is `null` when the `slash-menu` feature is off.
 */
export function useSlashMenu(editor: OpenEditor): {
  menu: SlashMenu | null;
  state: SlashMenuState;
} {
  const menu = getSlashMenu(editor);
  const state = useSyncExternalStore(
    menu?.store.subscribe ?? noSubscription,
    menu?.store.getState ?? getNoMenuState,
    getNoMenuState,
  );
  return { menu, state };
}

const NO_COLLAB_STATE: CollabState = { status: "local", synced: false, peers: [] };
const getNoCollabState = () => NO_COLLAB_STATE;

/**
 * Subscribes to the editor's collaboration session.
 *
 * @returns `collab` is `null` when the `collab` feature is off.
 */
export function useCollab(editor: OpenEditor): { collab: Collab | null; state: CollabState } {
  const collab = getCollab(editor);
  const state = useSyncExternalStore(
    collab?.store.subscribe ?? noSubscription,
    collab?.store.getState ?? getNoCollabState,
    getNoCollabState,
  );
  return { collab, state };
}
