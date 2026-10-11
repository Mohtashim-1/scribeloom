import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Notion-like editor" }).click();
  await expect(page.locator(".tiptap")).toContainText("Notes, the quiet way");
});

test("renders callouts, columns, toggles, mentions and formulas", async ({ page }) => {
  const doc = page.locator(".tiptap");

  await expect(doc.locator('.oe-callout[data-callout="info"]')).toContainText("Tip.");
  await expect(doc.locator(".oe-columns .oe-column")).toHaveCount(2);
  await expect(doc.locator(".oe-mention")).toHaveText("@Ada Lovelace");
  await expect(doc.locator('[data-type="block-math"] .katex')).toBeVisible();
  // Columns really are side by side.
  const [left, right] = await doc
    .locator(".oe-column")
    .evaluateAll((columns) => columns.map((column) => column.getBoundingClientRect().left));
  expect(right! - left!).toBeGreaterThan(100);
  await page.screenshot({ path: test.info().outputPath("blocks.png") });
});

test("folds and unfolds a toggle", async ({ page }) => {
  const toggle = page.locator(".tiptap .oe-toggle");
  const body = toggle.locator('[data-type="detailsContent"]');
  await expect(body).toBeVisible();

  await toggle.locator("> button").click();
  await expect(body).toBeHidden();
  await toggle.locator("> button").click();
  await expect(body).toBeVisible();
});

test("mentions someone with @", async ({ page }) => {
  const doc = page.locator(".tiptap");
  await doc.locator("p").last().click();
  await page.keyboard.type("Thanks @gr");

  const menu = page.getByRole("listbox", { name: "Mention someone" });
  await expect(menu.getByRole("option")).toHaveText(["GGrace HopperCompilers"]);
  await page.keyboard.press("Enter");

  await expect(doc.locator(".oe-mention").last()).toHaveText("@Grace Hopper");
  await expect(menu).toBeHidden();
});

test("edits a formula in place", async ({ page }) => {
  const formula = page.locator('.tiptap [data-type="block-math"]');
  await formula.click();

  const dialog = page.getByRole("dialog", { name: "Edit formula" });
  await dialog.getByLabel("LaTeX").fill("a^2 + b^2 = c^2");
  await expect(formula).toHaveAttribute("data-latex", "a^2 + b^2 = c^2");
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
});

test("the block handle adds, turns into, moves and deletes blocks", async ({ page }) => {
  const doc = page.locator(".tiptap");
  const heading = doc.locator("h2", { hasText: "Blocks" });
  await heading.hover();
  await page.getByRole("button", { name: "Add block below" }).click();
  await page.keyboard.type("Added by the handle");
  const added = doc.locator("p", { hasText: "Added by the handle" });
  await expect(added).toBeVisible();

  await added.hover();
  await page.getByRole("button", { name: /Block actions/ }).click();
  await page.getByRole("menuitem", { name: "Turn into" }).click();
  await page.getByRole("menuitem", { name: "Heading 3" }).click();
  await expect(doc.locator("h3", { hasText: "Added by the handle" })).toBeVisible();

  // Keyboard: move the block above the "Blocks" heading.
  await doc.locator("h3", { hasText: "Added by the handle" }).click();
  await page.keyboard.press("Control+Shift+ArrowUp");
  const order = await doc.locator("h2, h3").allTextContents();
  expect(order.indexOf("Added by the handle")).toBeLessThan(order.indexOf("Blocks"));

  await doc.locator("h3", { hasText: "Added by the handle" }).hover();
  await page.getByRole("button", { name: /Block actions/ }).click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(doc).not.toContainText("Added by the handle");
});

test("dragging the handle moves a block", async ({ page }) => {
  const doc = page.locator(".tiptap");
  const order = () =>
    doc
      .locator("> *")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-callout") ?? node.tagName),
      );
  const tip = doc.locator('.oe-callout[data-callout="info"]');
  const heading = doc.locator("h2", { hasText: "Blocks" });
  expect((await order()).indexOf("info")).toBeLessThan((await order()).indexOf("H2"));

  // Drag the tip by its grip and drop it just below the heading that follows it.
  await tip.hover();
  const grip = await page.getByRole("button", { name: /Block actions/ }).boundingBox();
  const target = await heading.boundingBox();
  await page.mouse.move(grip!.x + grip!.width / 2, grip!.y + grip!.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip!.x + 30, grip!.y + 20, { steps: 4 });
  await page.mouse.move(target!.x + 80, target!.y + target!.height - 2, { steps: 8 });
  await page.mouse.up();

  await expect
    .poll(async () => (await order()).indexOf("info"))
    .toBeGreaterThan((await order()).indexOf("H2"));
  await expect(tip).toContainText("Tip.");
});

test("inserts blocks from the slash menu", async ({ page }) => {
  const doc = page.locator(".tiptap");
  await doc.locator("p").last().click();
  await page.keyboard.type("/col");
  await page.getByRole("option", { name: /3 columns/ }).click();
  await expect(doc.locator('.oe-columns[data-columns="3"] .oe-column')).toHaveCount(3);
});
