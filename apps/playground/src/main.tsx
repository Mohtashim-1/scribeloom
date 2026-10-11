// Opt-in features: collaboration and math are not part of the default bundle.
import "@openedit/extensions/collab";
import "@openedit/extensions/math";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@openedit/ui/styles.css";
// Fonts and layout for formulas (the "math" feature).
import "katex/dist/katex.min.css";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
