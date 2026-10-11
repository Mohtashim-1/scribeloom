/**
 * Formats a shortcut such as `"Mod+Shift+S"` for the current platform:
 * `⌘⇧S` on Apple devices, `Ctrl+Shift+S` elsewhere.
 */
export function formatShortcut(shortcut: string, isApple = detectApple()): string {
  const keys = shortcut.split("+");
  if (isApple) {
    const symbols: Record<string, string> = { Mod: "⌘", Shift: "⇧", Alt: "⌥" };
    return keys.map((key) => symbols[key] ?? key).join("");
  }
  return keys.map((key) => (key === "Mod" ? "Ctrl" : key)).join("+");
}

function detectApple(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
}
