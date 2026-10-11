// Measures typing cost on long documents against a production build of the
// playground, with the default UI and without any (the engine's own cost).
// Usage: node perf.mjs [baseUrl]   (serve apps/playground/dist first)
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:4190";
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
for (const [count, ui] of [20, 2000, 5000].flatMap((size) => [
  [size, "off"],
  [size, "on"],
])) {
  const page = await browser.newPage();
  const started = Date.now();
  await page.goto(`${base}/?paragraphs=${count}&ui=${ui}`);
  await page.locator(".tiptap p").first().waitFor();
  const load = Date.now() - started;
  await page.locator(".tiptap p").first().click();
  await page.keyboard.press("End");
  const result = await page.evaluate(async () => {
    const sync = [];
    const frame = [];
    for (let i = 0; i < 60; i++) {
      const start = performance.now();
      document.execCommand("insertText", false, "x");
      sync.push(performance.now() - start);
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
      frame.push(performance.now() - start);
    }
    const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
    return { sync: median(sync), frame: median(frame) };
  });
  console.log(
    `paragraphs=${String(count).padEnd(5)} ui=${ui.padEnd(3)} load=${String(load).padStart(5)}ms  keystroke: handling=${result.sync.toFixed(1)}ms  to next frame=${result.frame.toFixed(1)}ms`,
  );
  await page.close();
}
await browser.close();
