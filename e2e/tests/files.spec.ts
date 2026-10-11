import { readFile } from "node:fs/promises";
import { wrapHtmlDocument } from "@openedit/export";
import { htmlToPdf } from "@openedit/export/server";
import { expect, test, type Page } from "@playwright/test";

async function chooseFromFileMenu(page: Page, item: string | RegExp) {
  await page
    .getByRole("toolbar", { name: "Formatting" })
    .getByRole("button", { name: "File" })
    .click();
  await page.getByRole("menuitem", { name: item }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".tiptap")).toContainText("Getting started");
});

test("downloads the document as Markdown", async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    chooseFromFileMenu(page, "Download Markdown"),
  ]);
  const markdown = await readFile(await download.path(), "utf8");

  expect(download.suggestedFilename()).toBe("document.md");
  expect(markdown).toContain("# Getting started");
  expect(markdown).toContain("- [x] Format text from the toolbar or with keyboard shortcuts");
  expect(markdown).toContain("| Feature | Package | Status |");
});

test("downloads a Word file that opens back to the same content", async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    chooseFromFileMenu(page, /Download Word/),
  ]);
  const path = await download.path();
  expect(download.suggestedFilename()).toBe("document.docx");

  // Clear the editor, then open the file we just saved.
  const doc = page.locator(".tiptap");
  await doc.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  await expect(doc).not.toContainText("Getting started");

  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    chooseFromFileMenu(page, /Open a file/),
  ]);
  await chooser.setFiles({
    name: "document.docx",
    mimeType: "application/octet-stream",
    buffer: await readFile(path),
  });

  await expect(doc.locator("h1")).toHaveText("Getting started");
  await expect(doc.locator("th")).toHaveText(["Feature", "Package", "Status"]);
  await expect(doc.locator('li[data-checked="true"]')).toHaveCount(2);
  await expect(doc.locator("pre")).toContainText('import { RichTextEditor } from "@openedit/ui";');
});

test("opens a Markdown file", async ({ page }) => {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    chooseFromFileMenu(page, /Open a file/),
  ]);
  await chooser.setFiles({
    name: "notes.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Imported\n\n1. one\n2. two\n\n> quoted\n"),
  });

  const doc = page.locator(".tiptap");
  await expect(doc.locator("h1")).toHaveText("Imported");
  await expect(doc.locator("ol li")).toHaveCount(2);
  await expect(doc.locator("blockquote")).toHaveText("quoted");
});

test("renders a PDF on the server with a headless browser", async ({ browser }) => {
  const html = wrapHtmlDocument("<h1>Report</h1><p>Rendered without a person.</p>", {
    title: "Report",
  });

  const pdf = await htmlToPdf(browser, html, { format: "Letter" });

  expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(1000);
});
