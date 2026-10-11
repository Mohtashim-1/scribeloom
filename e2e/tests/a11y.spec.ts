import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".tiptap")).toContainText("Getting started");
});

test("the document is a named, multi-line text box", async ({ page }) => {
  const doc = page.getByRole("textbox", { name: "Rich text editor" });
  await expect(doc).toHaveAttribute("aria-multiline", "true");
  await expect(doc).toBeEditable();
});

test("every toolbar button has a name", async ({ page }) => {
  const buttons = page.getByRole("toolbar", { name: "Formatting" }).getByRole("button");
  const names = await buttons.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("aria-label") ?? node.textContent?.trim() ?? ""),
  );
  expect(names.length).toBeGreaterThan(15);
  expect(names.filter((name) => !name)).toEqual([]);
});

test("the toolbar is one tab stop, with arrow keys inside it", async ({ page }) => {
  const toolbar = page.getByRole("toolbar", { name: "Formatting" });
  await page.locator(".tiptap h1").click();
  await toolbar.getByRole("button", { name: "Bold" }).focus();

  await page.keyboard.press("ArrowRight");
  await expect(toolbar.getByRole("button", { name: "Italic" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(toolbar.getByRole("button", { name: "Code block" })).toBeFocused();

  // One Tab leaves the toolbar entirely and lands in the document.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "Rich text editor" })).toBeFocused();
});

test("a menu can be used from the keyboard, and focus returns to the document", async ({
  page,
}) => {
  const doc = page.locator(".tiptap");
  await doc.locator("h2").first().click();
  const toolbar = page.getByRole("toolbar", { name: "Formatting" });
  await toolbar.getByRole("button", { name: "Text style" }).focus();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  // The menu opens on its first item, "Text"; Heading 3 is three down.
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");

  await expect(doc.locator("h3", { hasText: "Things to try" })).toBeVisible();
  await expect(doc).toBeFocused();
});

test("the slash menu announces the active option while focus stays in the document", async ({
  page,
}) => {
  const doc = page.getByRole("textbox", { name: "Rich text editor" });
  await doc.locator("p").last().click();
  await page.keyboard.type("/");
  const list = page.getByRole("listbox", { name: "Insert block" });
  await expect(list).toBeVisible();

  await expect(doc).toBeFocused();
  await expect(doc).toHaveAttribute("aria-controls", (await list.getAttribute("id"))!);
  const first = await doc.getAttribute("aria-activedescendant");
  await expect(page.locator(`[id="${first}"]`)).toHaveAttribute("aria-selected", "true");

  await page.keyboard.press("ArrowDown");
  const second = await doc.getAttribute("aria-activedescendant");
  expect(second).not.toBe(first);
  await expect(page.locator(`[id="${second}"]`)).toHaveText(/Heading 1/);

  await page.keyboard.press("Escape");
  await expect(doc).not.toHaveAttribute("aria-activedescendant", /.+/);
});

test("formatting works with the keyboard alone", async ({ page }) => {
  const doc = page.locator(".tiptap");
  await doc.locator("p").last().click();
  await page.keyboard.type("plain ");
  await page.keyboard.press("Control+b");
  await page.keyboard.type("bold");
  await page.keyboard.press("Control+b");

  await expect(doc.locator("p").last().locator("strong")).toHaveText("bold");
  await expect(
    page.getByRole("toolbar", { name: "Formatting" }).getByRole("button", { name: "Bold" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("Alt+F10 moves focus to the selection menu, and Escape returns to the text", async ({
  page,
}) => {
  const doc = page.getByRole("textbox", { name: "Rich text editor" });
  await page.locator(".tiptap strong", { hasText: "everything is free" }).dblclick();
  const menu = page.getByRole("toolbar", { name: "Selection formatting" });
  await expect(menu).toBeVisible();

  await page.keyboard.press("Alt+F10");
  await expect(menu.getByRole("button").first()).toBeFocused();
  // The menu stays while focus is inside it, and the arrow keys walk its buttons.
  await page.keyboard.press("ArrowRight");
  await expect(menu.getByRole("button", { name: "Bold" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "false");

  await menu.getByRole("button", { name: "Italic" }).focus();
  await page.keyboard.press("Escape");
  await expect(doc).toBeFocused();
});

test("Alt+F10 moves focus to the toolbar when nothing is selected", async ({ page }) => {
  await page.locator(".tiptap p").last().click();
  await page.keyboard.press("Alt+F10");

  const toolbar = page.getByRole("toolbar", { name: "Formatting" });
  await expect(toolbar.getByRole("button").and(page.locator(":focus"))).toHaveCount(1);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox", { name: "Rich text editor" })).toBeFocused();
});

test("text and controls meet contrast requirements in both themes", async ({ page }) => {
  // WCAG relative luminance contrast, computed from the rendered colours.
  const contrastOf = () =>
    page.evaluate(() => {
      const luminance = (rgb: string) => {
        const [r, g, b] = rgb
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map((value) => {
            const channel = Number(value) / 255;
            return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const ratio = (a: string, b: string) => {
        const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
        return (high! + 0.05) / (low! + 0.05);
      };
      const root = document.querySelector(".oe-root")!;
      const background = getComputedStyle(root).backgroundColor;
      const color = (selector: string) => getComputedStyle(root.querySelector(selector)!).color;
      return {
        text: ratio(color(".tiptap p"), background),
        link: ratio(color(".tiptap a"), background),
        icon: ratio(color('[role="toolbar"] button:not(:disabled)'), background),
      };
    });

  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "Switch to dark theme" }).click();
    const contrast = await contrastOf();
    expect(contrast.text, `${theme} text`).toBeGreaterThanOrEqual(4.5);
    expect(contrast.link, `${theme} link`).toBeGreaterThanOrEqual(4.5);
    // Icons are graphical objects: 3:1.
    expect(contrast.icon, `${theme} icon`).toBeGreaterThanOrEqual(3);
  }
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true });

  test("fits the screen, and the toolbar scrolls instead of wrapping", async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const toolbar = page.getByRole("toolbar", { name: "Formatting" });
    const box = await toolbar.boundingBox();
    expect(box!.height).toBeLessThan(60);
    expect(await toolbar.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("phone.png") });
  });

  test("floating menus stay inside the screen", async ({ page }) => {
    await page.locator(".tiptap strong", { hasText: "everything is free" }).dblclick();
    const menu = page.getByRole("toolbar", { name: "Selection formatting" });
    await expect(menu).toBeVisible();

    const box = await menu.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });

  test("columns stack", async ({ page }) => {
    await page.getByRole("tab", { name: "Notion-like editor" }).click();
    const tops = await page
      .locator(".tiptap .oe-column")
      .evaluateAll((columns) =>
        columns.map((column) => Math.round(column.getBoundingClientRect().top)),
      );
    expect(tops[1]).toBeGreaterThan(tops[0]!);
  });
});
