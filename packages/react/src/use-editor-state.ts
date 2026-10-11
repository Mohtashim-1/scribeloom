import type { OpenEditor } from "@openedit/core";
import { useCallback, useRef, useSyncExternalStore } from "react";

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every(
    (key) =>
      Object.hasOwn(b, key) &&
      Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

/**
 * Subscribes a component to a slice of editor state. The component re-renders
 * only when the selected value changes (compared shallowly), not on every
 * keystroke.
 *
 * @returns The selected value, or `null` while there is no editor.
 *
 * @example
 * ```tsx
 * const state = useEditorState(editor, (e) => ({
 *   bold: e.isActive("bold"),
 *   canUndo: e.can().undo(),
 * }));
 * ```
 */
export function useEditorState<T>(
  editor: OpenEditor | null,
  selector: (editor: OpenEditor) => T,
): T | null {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const cache = useRef<{ editor: OpenEditor; value: T } | null>(null);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!editor) return () => {};
      // Mounting changes what the editor can report (focus, rectangles,
      // whether a command can run) without a transaction.
      const stops = (["transaction", "mount", "unmount"] as const).map((event) =>
        editor.on(event, onChange),
      );
      return () => stops.forEach((stop) => stop());
    },
    [editor],
  );

  const getSnapshot = useCallback((): T | null => {
    if (!editor || editor.isDestroyed) return null;
    const value = selectorRef.current(editor);
    const cached = cache.current;
    if (cached && cached.editor === editor && shallowEqual(cached.value, value)) {
      return cached.value;
    }
    cache.current = { editor, value };
    return value;
  }, [editor]);

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
