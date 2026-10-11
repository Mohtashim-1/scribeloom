import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { EditorTheme } from "./context";

const QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

/**
 * Theme state for `<Editor>`: follows the `theme` prop when it changes, lets
 * the UI change it, and resolves `"system"` against the operating system.
 */
export function useTheme(
  themeProp: EditorTheme | undefined,
  onThemeChange: ((theme: EditorTheme) => void) | undefined,
) {
  const [theme, setThemeState] = useState<EditorTheme>(themeProp ?? "system");
  useEffect(() => {
    if (themeProp !== undefined) setThemeState(themeProp);
  }, [themeProp]);

  const prefersDark = useSyncExternalStore(subscribe, systemPrefersDark, () => false);
  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  const setTheme = useCallback(
    (next: EditorTheme) => {
      setThemeState(next);
      onThemeChange?.(next);
    },
    [onThemeChange],
  );

  return { theme, resolvedTheme, setTheme };
}
