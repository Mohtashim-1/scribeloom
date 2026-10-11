import { createEditor, type OpenEditor } from "@openedit/core";
import "@openedit/themes/styles.css";
import "./styles.css";

const editor = createEditor({
  element: document.querySelector<HTMLElement>("#editor")!,
  content:
    "<h1>No framework</h1><p>This editor is <strong>@openedit/core</strong> and a few plain buttons.</p>",
  placeholder: "Write something…",
});

const commands: Record<string, (editor: OpenEditor) => void> = {
  bold: (e) => e.chain().focus().toggleBold().run(),
  italic: (e) => e.chain().focus().toggleItalic().run(),
  bulletList: (e) => e.chain().focus().toggleBulletList().run(),
  undo: (e) => e.chain().focus().undo().run(),
  redo: (e) => e.chain().focus().redo().run(),
};

const buttons = document.querySelectorAll<HTMLButtonElement>("[data-command]");
buttons.forEach((button) => {
  // Keep the selection in the document when a button is pressed.
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => commands[button.dataset.command!]?.(editor));
});

/** Reflects the editor's state in the buttons and the word count. */
function render() {
  buttons.forEach((button) => {
    const name = button.dataset.command!;
    if (name === "undo") button.disabled = !editor.can().undo();
    else if (name === "redo") button.disabled = !editor.can().redo();
    else button.setAttribute("aria-pressed", String(editor.isActive(name)));
  });
  const words = editor.getText().split(/\s+/).filter(Boolean).length;
  document.querySelector("#count")!.textContent = `${words} word${words === 1 ? "" : "s"}`;
}
editor.on("transaction", render);
render();

const root = document.querySelector<HTMLElement>(".oe-root")!;
const themeButton = document.querySelector<HTMLButtonElement>("#theme")!;
themeButton.addEventListener("click", () => {
  const next = root.dataset.oeTheme === "dark" ? "light" : "dark";
  root.dataset.oeTheme = next;
  themeButton.textContent = next === "dark" ? "Light" : "Dark";
});
