import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".tiptap")).toContainText("Getting started");
});

test("formats a selection from the floating menu", async ({ page }) => {
  const doc = page.locator(".tiptap");
  await doc.locator("strong", { hasText: "everything is free" }).dblclick();

  const bubble = page.getByRole("toolbar", { name: "Selection formatting" });
  await bubble.getByRole("button", { name: "Italic" }).click();

  await expect(doc.locator("em", { hasText: "everything" })).toHaveCount(1);
  await expect(bubble.getByRole("button", { name: "Italic" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("adds a link, rejecting unsafe URLs", async ({ page }) => {
  const doc = page.locator(".tiptap");
  await doc.locator("strong", { hasText: "everything is free" }).dblclick();
  await page
    .getByRole("toolbar", { name: "Selection formatting" })
    .getByRole("button", { name: "Link" })
    .click();
  const url = page.getByLabel("Link URL");

  await url.fill("javascript:alert(1)");
  await url.press("Enter");
  await expect(url).toHaveAttribute("aria-invalid", "true");

  await url.fill("example.com/docs");
  await url.press("Enter");
  await expect(doc.locator('a[href="https://example.com/docs"]')).toHaveCount(1);
});

test("inserts a block from the slash menu with the keyboard", async ({ page }) => {
  const doc = page.locator(".tiptap");
  await doc.locator("p").last().click();
  await page.keyboard.type("/");

  const menu = page.getByRole("listbox", { name: "Insert block" });
  await expect(menu).toBeVisible();
  await page.keyboard.type("quo");
  await expect(menu.getByRole("option")).toHaveText(["QuoteBlock quotation"]);
  await page.keyboard.press("Enter");

  await expect(menu).toBeHidden();
  await expect(doc.locator("blockquote")).toHaveCount(2);
});

test("changes the block type from the toolbar and returns focus to the document", async ({
  page,
}) => {
  const doc = page.locator(".tiptap");
  await doc.locator("h2").first().click();
  await page
    .getByRole("toolbar", { name: "Formatting" })
    .getByRole("button", { name: "Text style" })
    .click();
  await page.getByRole("menuitem", { name: "Heading 3" }).click();

  await expect(doc.locator("h3")).toHaveText("Things to try");
  await expect(doc).toBeFocused();
});

test("edits a table from its menu", async ({ page }) => {
  const doc = page.locator(".tiptap");
  await doc.locator("td", { hasText: "Core editor" }).click();
  const menu = page.getByRole("toolbar", { name: "Table" });

  await menu.getByRole("button", { name: "Insert row below" }).click();
  await expect(doc.locator("tr")).toHaveCount(5);

  await menu.getByRole("button", { name: "Delete table" }).click();
  await expect(doc.locator("table")).toHaveCount(0);
});

test("uploads an image and shows its controls", async ({ page }) => {
  const doc = page.locator(".tiptap");
  await doc.locator("p").last().click();
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page
      .getByRole("toolbar", { name: "Formatting" })
      .getByRole("button", { name: "Image" })
      .click(),
  ]);
  await chooser.setFiles({
    name: "square.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><rect width="200" height="120" fill="#5b4fe8"/></svg>',
    ),
  });

  const image = doc.locator("img");
  await expect(image).toHaveAttribute("alt", "square.svg");
  await image.click();
  await expect(page.getByRole("toolbar", { name: "Image" })).toBeVisible();
  await page.getByRole("button", { name: "Delete image" }).click();
  await expect(image).toHaveCount(0);
});

test("switches theme and swaps the UI between demos", async ({ page }) => {
  const root = page.locator(".oe-root").first();
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(root).toHaveAttribute("data-oe-theme", "dark");

  await page.getByRole("tab", { name: "Customized" }).click();
  await expect(page.getByRole("toolbar", { name: "Formatting" }).getByRole("button")).toHaveCount(
    5,
  );
});
