import { COLLAB_URL } from "../playwright.config";
import { expect, test, type Browser } from "@playwright/test";

const uniqueRoom = () => `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function openWindow(browser: Browser, room: string) {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`/?room=${room}&collab=${COLLAB_URL}`);
  await page.getByRole("tab", { name: "Collaboration" }).click();
  const pane = page.locator(".card").first();
  const doc = pane.locator(".tiptap");
  await expect(doc).toContainText("Write together");
  return { page, pane, doc };
}

test("a comment stays anchored while someone else edits around it", async ({ browser }) => {
  const room = uniqueRoom();
  const first = await openWindow(browser, room);
  const second = await openWindow(browser, room);

  // Window one comments on the word "together" in the heading.
  await first.doc.locator("h1").dblclick({ position: { x: 150, y: 14 } });
  await first.pane
    .getByRole("toolbar", { name: "Selection formatting" })
    .getByRole("button", { name: "Comment" })
    .click();
  const composer = first.pane.getByRole("textbox", { name: "Comment" });
  await composer.fill("Is this the right word?");
  await composer.press("Control+Enter");
  const quote = await first.doc.locator(".oe-comment").textContent();
  expect(quote).toBe("together");

  // Window two sees the thread, then edits before and after the commented word.
  const remoteThread = second.pane.getByRole("article", { name: `Comment on ${quote}` });
  await expect(remoteThread).toContainText("Is this the right word?");
  await second.doc.locator("h1").click({ position: { x: 2, y: 14 } });
  await second.page.keyboard.press("Home");
  await second.page.keyboard.type("Now: ");
  await second.page.keyboard.press("End");
  await second.page.keyboard.type(" today");

  for (const { doc, pane } of [first, second]) {
    await expect(doc.locator("h1")).toContainText("Now: Write together today");
    await expect(doc.locator(".oe-comment")).toHaveText("together");
    await expect(pane.getByRole("article", { name: "Comment on together" })).toBeVisible();
  }

  // A reply from window two reaches window one.
  await remoteThread.click();
  await remoteThread.getByLabel("Reply").fill("Yes, keep it");
  await remoteThread.getByRole("button", { name: "Reply" }).click();
  await expect(first.pane.getByRole("article", { name: "Comment on together" })).toContainText(
    "Yes, keep it",
  );
});

test("suggesting mode records edits, which can be accepted or rejected", async ({ page }) => {
  await page.goto("/");
  const doc = page.locator(".tiptap");
  await page.getByRole("button", { name: "Suggest edits" }).click();

  await doc.locator("h1").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" now");
  for (let i = 0; i < 8; i++) await page.keyboard.press("Alt+Shift+ArrowLeft").catch(() => {});
  await expect(doc.locator("h1 ins")).toHaveText(" now");

  // Backspacing over existing text keeps it, struck through.
  await doc.locator("h2").first().click();
  await page.keyboard.press("End");
  for (let i = 0; i < 3; i++) await page.keyboard.press("Backspace");
  await expect(doc.locator("h2 del").first()).toHaveText("try");

  const sidebar = page.getByRole("complementary", { name: "Comments and suggestions" });
  await expect(sidebar.getByRole("article", { name: "Suggestion" })).toHaveCount(2);
  await page.screenshot({ path: test.info().outputPath("review.png") });

  await sidebar.getByRole("button", { name: "Accept suggestion" }).first().click();
  await expect(doc.locator("h1")).toHaveText("Getting started now");
  await sidebar.getByRole("button", { name: "Reject suggestion" }).click();
  await expect(doc.locator("h2").first()).toHaveText("Things to try");
  await expect(sidebar).toHaveCount(0);
});
