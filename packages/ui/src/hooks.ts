import type { AI, AIState } from "@openedit/ai";
import type { OpenEditor } from "@openedit/core";
import type {
  BlockHandle,
  BlockHandleState,
  Collab,
  CollabState,
  Comments,
  CommentsState,
  MathEditor,
  MathState,
  Mentions,
  MentionsState,
  SlashMenu,
  SlashMenuState,
  Suggestions,
  SuggestionsState,
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

/*
 * Reads a feature's handle from the editor. The features themselves are only
 * imported as types here, so using these hooks does not pull a feature (say,
 * collaboration and its sync library) into the bundle. It is `null` when the
 * app has not enabled that feature.
 */
function featureOf<T>(editor: OpenEditor, name: string): T | null {
  const storage = editor.engine.storage as unknown as Record<string, unknown>;
  return (storage[name] as T | undefined) ?? null;
}

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
  /** Gap between the rectangle and the element, in pixels. @defaultValue `8` */
  gap?: number;
  /** Change this when the rectangle moves for a reason other than an edit or scroll. */
  updateKey?: unknown;
}): { setFloating: (element: HTMLElement | null) => void; style: CSSProperties } {
  const { editor, open, placement = "top", gap = 8, updateKey } = options;
  const getRect = useRef(options.getRect);
  getRect.current = options.getRect;

  const { refs, floatingStyles, update, isPositioned } = useFloating({
    open,
    placement,
    strategy: "fixed",
    middleware: [offset(gap), flip({ padding: 8 }), shift({ padding: 8 })],
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

  useLayoutEffect(() => {
    if (open) update();
  }, [open, update, updateKey]);

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
  const menu = featureOf<SlashMenu>(editor, "slashMenu");
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
  const collab = featureOf<Collab>(editor, "collab");
  const state = useSyncExternalStore(
    collab?.store.subscribe ?? noSubscription,
    collab?.store.getState ?? getNoCollabState,
    getNoCollabState,
  );
  return { collab, state };
}

const NO_COMMENTS_STATE: CommentsState = { threads: [], activeThreadId: null, drafting: false };
const getNoCommentsState = () => NO_COMMENTS_STATE;

/**
 * Subscribes to the editor's comment threads.
 *
 * @returns `comments` is `null` when the `comments` feature is off.
 */
export function useComments(editor: OpenEditor): {
  comments: Comments | null;
  state: CommentsState;
} {
  const comments = featureOf<Comments>(editor, "comments");
  const state = useSyncExternalStore(
    comments?.store.subscribe ?? noSubscription,
    comments?.store.getState ?? getNoCommentsState,
    getNoCommentsState,
  );
  return { comments, state };
}

const NO_SUGGESTIONS_STATE: SuggestionsState = { enabled: false, suggestions: [] };
const getNoSuggestionsState = () => NO_SUGGESTIONS_STATE;

/**
 * Subscribes to the editor's suggestion mode and pending suggestions.
 *
 * @returns `suggestions` is `null` when the `suggestions` feature is off.
 */
export function useSuggestions(editor: OpenEditor): {
  suggestions: Suggestions | null;
  state: SuggestionsState;
} {
  const suggestions = featureOf<Suggestions>(editor, "suggestions");
  const state = useSyncExternalStore(
    suggestions?.store.subscribe ?? noSubscription,
    suggestions?.store.getState ?? getNoSuggestionsState,
    getNoSuggestionsState,
  );
  return { suggestions, state };
}

const NO_AI_STATE: AIState = { status: "idle", actionId: null, output: "", error: null };
const getNoAIState = () => NO_AI_STATE;

/**
 * Subscribes to the editor's AI feature.
 *
 * @returns `ai` is `null` when the `ai` feature is off.
 */
export function useAI(editor: OpenEditor): { ai: AI | null; state: AIState } {
  const ai = featureOf<AI>(editor, "ai");
  const state = useSyncExternalStore(
    ai?.store.subscribe ?? noSubscription,
    ai?.store.getState ?? getNoAIState,
    getNoAIState,
  );
  return { ai, state };
}

function useFeatureStore<
  Handle extends { store: { subscribe: (l: () => void) => () => void; getState: () => State } },
  State,
>(handle: Handle | null, fallback: State): State {
  const getFallback = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(
    handle?.store.subscribe ?? noSubscription,
    handle?.store.getState ?? getFallback,
    getFallback,
  );
}

const NO_BLOCK: BlockHandleState = { pos: null, type: null };
const NO_MENTIONS: MentionsState = {
  open: false,
  query: "",
  items: [],
  selectedIndex: 0,
  loading: false,
  getRect: null,
};
const NO_MATH: MathState = { editing: null };

/** Subscribes to the block under the pointer. `handle` is `null` when `block-handle` is off. */
export function useBlockHandle(editor: OpenEditor): {
  handle: BlockHandle | null;
  state: BlockHandleState;
} {
  const handle = featureOf<BlockHandle>(editor, "blockHandle");
  return { handle, state: useFeatureStore(handle, NO_BLOCK) };
}

/** Subscribes to the `@` mention menu. `mentions` is `null` when the feature is off. */
export function useMentions(editor: OpenEditor): {
  mentions: Mentions | null;
  state: MentionsState;
} {
  const mentions = featureOf<Mentions>(editor, "mentions");
  return { mentions, state: useFeatureStore(mentions, NO_MENTIONS) };
}

/** Subscribes to the formula being edited. `math` is `null` when the feature is off. */
export function useMath(editor: OpenEditor): { math: MathEditor | null; state: MathState } {
  const math = featureOf<MathEditor>(editor, "math");
  return { math, state: useFeatureStore(math, NO_MATH) };
}

/**
 * Connects a floating list to the document for assistive technology. Focus
 * stays in the editor while the user arrows through the list, so the editor
 * element itself has to say which list it controls and which option is active.
 */
export function useActiveDescendant(
  editor: OpenEditor,
  open: boolean,
  listId: string,
  activeId: string | undefined,
): void {
  useEffect(() => {
    const element = editor.element;
    if (!open || !element) return;
    element.setAttribute("aria-controls", listId);
    element.setAttribute("aria-expanded", "true");
    if (activeId) element.setAttribute("aria-activedescendant", activeId);
    else element.removeAttribute("aria-activedescendant");
    return () => {
      element.removeAttribute("aria-controls");
      element.removeAttribute("aria-expanded");
      element.removeAttribute("aria-activedescendant");
    };
  }, [editor, open, listId, activeId]);
}

/**
 * Whether the editor has focus, staying `true` for a moment after it loses
 * it. Floating menus use this so that pressing Tab can move focus into them:
 * without the grace period they would close as the editor blurs, before
 * focus arrives.
 */
export function useEditorFocus(editor: OpenEditor, lingerMs = 150): boolean {
  const focused = useEditorState(editor, (e) => e.isFocused) ?? false;
  const [lingering, setLingering] = useState(false);
  const wasFocused = useRef(focused);
  useEffect(() => {
    const lost = wasFocused.current && !focused;
    wasFocused.current = focused;
    if (!lost) return;
    setLingering(true);
    const timer = setTimeout(() => setLingering(false), lingerMs);
    return () => clearTimeout(timer);
  }, [focused, lingerMs]);
  // `wasFocused` covers the render in which focus was just lost, before the effect runs.
  return focused || lingering || (wasFocused.current && !focused);
}

/**
 * Alt+F10, the usual shortcut for "go to the editor's toolbar". While
 * `enabled`, pressing it in the document moves focus to the first usable
 * button inside `getContainer()`. The floating selection menu claims the
 * shortcut over the fixed toolbar by marking itself with `data-oe-priority`.
 */
export function useToolbarShortcut(
  editor: OpenEditor,
  getContainer: () => HTMLElement | null,
  options: { enabled?: boolean; priority?: boolean } = {},
): void {
  const { enabled = true, priority = false } = options;
  const container = useRef(getContainer);
  container.current = getContainer;
  const element = useEditorState(editor, (e) => e.element);
  useEffect(() => {
    if (!enabled || !element) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "F10" || !event.altKey) return;
      const target = container.current();
      if (!target) return;
      // Let a menu that is closer to the user's selection take it.
      if (!priority && target.ownerDocument.querySelector("[data-oe-priority]")) return;
      const button = target.querySelector<HTMLElement>("button:not(:disabled), [tabindex='0']");
      if (!button) return;
      event.preventDefault();
      button.focus();
    };
    element.addEventListener("keydown", onKeyDown);
    return () => element.removeEventListener("keydown", onKeyDown);
  }, [element, enabled, priority]);
}
