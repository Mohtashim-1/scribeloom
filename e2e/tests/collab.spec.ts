import { expect, test, type Browser, type Page } from "@playwright/test";

/** Opens the collaboration demo in its own window, in the given room. */
async function openWindow(browser: Browser, room: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/?room=${room}`);
  await page.getByRole("tab", { name: "Collaboration" }).click();
  // Each window shows two editors; these tests drive the first one.
  const pane = page.locator(".card").first();
  const doc = pane.locator(".tiptap");
  await expect(doc).toContainText("Write together");
  return { context, page, pane, doc };
}

async function typeAtEnd(page: Page, doc: ReturnType<Page["locator"]>, text: string) {
  await doc.locator("p").last().click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(text);
}

const uniqueRoom = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

test.describe("collaboration", () => {
  test("two windows edit the same document in real time", async ({ browser }) => {
    const room = uniqueRoom();
    const first = await openWindow(browser, room);
    const second = await openWindow(browser, room);

    await typeAtEnd(first.page, first.doc, "typed in window one");
    await expect(second.doc).toContainText("typed in window one");

    await typeAtEnd(second.page, second.doc, " and window two");
    await expect(first.doc).toContainText("typed in window one and window two");

    // The starter content was added once, not once per editor.
    await expect(first.doc.locator("h1")).toHaveCount(1);
  });

  test("shows who is present and where their cursor is", async ({ browser }) => {
    const room = uniqueRoom();
    const first = await openWindow(browser, room);
    const second = await openWindow(browser, room);

    // Two windows with two editors each.
    await expect(first.pane.getByRole("group", { name: /In this document/ })).toHaveAccessibleName(
      /Ada Lovelace \(you\).*Grace Hopper.*/,
    );
    await expect(first.pane.locator('[title="Ada Lovelace (you)"]')).toHaveCount(1);

    await typeAtEnd(second.page, second.doc, "here");
    await expect(first.doc.locator(".oe-caret-label", { hasText: "Ada Lovelace" })).toBeVisible();
  });

  test("merges edits from both sides after a temporary disconnect", async ({ browser }) => {
    const room = uniqueRoom();
    const first = await openWindow(browser, room);
    const second = await openWindow(browser, room);

    await second.pane.getByRole("button", { name: "Go offline" }).click();
    await expect(second.pane.getByRole("status")).toHaveText("Offline");

    await typeAtEnd(second.page, second.doc, "written offline.");
    await first.doc.locator("h1").click();
    await first.page.keyboard.press("End");
    await first.page.keyboard.type(" (edited online)");

    // While apart, neither side has the other's change.
    await expect(first.doc).not.toContainText("written offline.");
    await expect(second.doc).not.toContainText("(edited online)");

    await second.pane.getByRole("button", { name: "Go online" }).click();

    for (const { doc } of [first, second]) {
      await expect(doc).toContainText("written offline.");
      // toContainText, because the other person's cursor label sits in the heading too.
      await expect(doc.locator("h1")).toContainText("Write together (edited online)");
    }
    await expect(second.pane.getByRole("status")).toHaveCount(0);
  });

  test("keeps offline edits across a page reload", async ({ browser }) => {
    const room = uniqueRoom();
    const { page, pane, doc } = await openWindow(browser, room);

    await pane.getByRole("button", { name: "Go offline" }).click();
    await expect(pane.getByRole("status")).toHaveText("Offline");
    // The server never receives this, so it can only come back from the browser's own copy.
    await typeAtEnd(page, doc, "saved in the browser");
    await page.waitForTimeout(500);

    await page.reload();
    await page.getByRole("tab", { name: "Collaboration" }).click();

    await expect(page.locator(".card").first().locator(".tiptap")).toContainText(
      "saved in the browser",
    );
  });

  test("keeps rooms separate", async ({ browser }) => {
    const first = await openWindow(browser, uniqueRoom());
    const other = await openWindow(browser, uniqueRoom());

    await typeAtEnd(first.page, first.doc, "only in the first room");
    await first.page.waitForTimeout(500);

    await expect(other.doc).not.toContainText("only in the first room");
  });
});
