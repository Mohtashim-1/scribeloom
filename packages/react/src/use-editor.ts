import { createEditor, type EditorOptions, type OpenEditor } from "@openedit/core";
import { useEffect, useLayoutEffect, useRef, useState, type DependencyList } from "react";

// Layout effect in the browser, so the editor exists before the first paint;
// plain effect on the server, where layout effects warn.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Creates an editor for the lifetime of the component and destroys it on
 * unmount.
 *
 * Returns `null` on the first render and during server rendering, because the
 * editor is created in an effect (before the first paint, so nothing flashes). Options are read when the editor is created;
 * pass `deps` to recreate it when they change. `editable` and `onUpdate` are
 * the exceptions and always follow the latest render.
 *
 * @example
 * ```tsx
 * const editor = useEditor({ content: "<p>Hello</p>" });
 * return <EditorContent editor={editor} />;
 * ```
 */
export function useEditor(
  options: EditorOptions = {},
  deps: DependencyList = [],
): OpenEditor | null {
  const [editor, setEditor] = useState<OpenEditor | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useIsomorphicLayoutEffect(() => {
    const instance = createEditor({
      ...optionsRef.current,
      onUpdate: (current) => optionsRef.current.onUpdate?.(current),
    });
    setEditor(instance);
    return () => {
      instance.destroy();
      setEditor(null);
    };
    // The caller owns the dependency list, as with useMemo.
  }, deps);

  const editable = options.editable ?? true;
  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return editor;
}
