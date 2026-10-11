import { useEditorContext } from "@openedit/react";
import { Moon, Sun } from "lucide-react";
import { BarButton } from "./bar";

/**
 * Bar button that switches the editor between light and dark.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useEditorContext();
  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <BarButton label={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
      {resolvedTheme === "dark" ? (
        <Moon size={16} aria-hidden="true" />
      ) : (
        <Sun size={16} aria-hidden="true" />
      )}
    </BarButton>
  );
}
