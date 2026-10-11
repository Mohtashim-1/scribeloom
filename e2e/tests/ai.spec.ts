import { expect, test, type Page } from "@playwright/test";

const AI_URL = "http://localhost:11434/v1";

/** Answers the editor's AI requests with a canned stream, like a local model server would. */
async function fakeModel(page: Page, words: string[], seen: unknown[] = []) {
  await page.route(`${AI_URL}/models`, (route) =>
    route.fulfill({ json: { data: [{ id: "test-model" }] } }),
  );
  await page.route(`${AI_URL}/chat/completions`, (route) => {
    seen.push(route.request().postDataJSON());
    const body =
      words
        .map((word) => `data: ${JSON.stringify({ choices: [{ delta: { content: word } }] })}\n\n`)
        .join("") + "data: [DONE]\n\n";
    return route.fulfill({ status: 200, contentType: "text/event-stream", body });
  });
  return seen;
}

async function selectFirstParagraph(page: Page) {
  const paragraph = page.locator(".tiptap p").first();
  await paragraph.click({ clickCount: 3 });
  return paragraph;
}

test("improves the selection: preview first, then accept", async ({ page }) => {
  const requests = await fakeModel(page, ["A much ", "better ", "sentence."]);
  await page.goto("/");
  const paragraph = await selectFirstParagraph(page);
  const original = await paragraph.textContent();

  await page
    .getByRole("toolbar", { name: "Selection formatting" })
    .getByRole("button", { name: "AI" })
    .click();
  await page.getByRole("menuitem", { name: "Improve writing" }).click();

  const panel = page.getByRole("dialog", { name: "AI: Improve writing" });
  await expect(panel.getByRole("button", { name: "Accept" })).toBeFocused();
  // The preview sits beside the original, which is still in the document.
  await expect(page.locator(".oe-ai-preview")).toHaveText("A much better sentence.");
  await expect(paragraph).toContainText(original!.slice(0, 20));
  expect(requests[0]).toMatchObject({ model: "test-model", stream: true });

  await page.keyboard.press("Enter");

  await expect(paragraph).toHaveText("A much better sentence.");
  await expect(panel).toBeHidden();
});

test("discarding leaves the document unchanged", async ({ page }) => {
  await fakeModel(page, ["Unwanted."]);
  await page.goto("/");
  const paragraph = await selectFirstParagraph(page);
  const original = await paragraph.textContent();

  await page
    .getByRole("toolbar", { name: "Selection formatting" })
    .getByRole("button", { name: "AI" })
    .click();
  await page.getByRole("menuitem", { name: "Make shorter" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();

  await expect(paragraph).toHaveText(original!);
  await expect(page.locator(".oe-ai-preview")).toHaveCount(0);
});

test("asks AI from the slash menu with a typed instruction", async ({ page }) => {
  const requests = await fakeModel(page, ["Roses are red."]);
  await page.goto("/");
  const doc = page.locator(".tiptap");
  await doc.locator("p").last().click();
  await page.keyboard.type("/ask");
  await page.keyboard.press("Enter");

  const panel = page.getByRole("dialog", { name: "AI: Ask AI" });
  await panel.getByLabel("Instruction").fill("Write a line of poetry");
  await page.keyboard.press("Enter");
  await panel.getByRole("button", { name: "Accept" }).click();

  await expect(doc).toContainText("Roses are red.");
  expect(JSON.stringify(requests[0])).toContain("Write a line of poetry");
});

test("explains when the model server cannot be reached", async ({ page }) => {
  await page.route(`${AI_URL}/**`, (route) => route.abort("connectionrefused"));
  await page.goto("/");
  await selectFirstParagraph(page);

  await page
    .getByRole("toolbar", { name: "Selection formatting" })
    .getByRole("button", { name: "AI" })
    .click();
  await page.getByRole("menuitem", { name: "Summarize" }).click();

  await expect(page.getByRole("alert")).toContainText("Could not reach the AI endpoint");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

// The milestone's acceptance test. Needs a local Ollama: E2E_OLLAMA=1 pnpm e2e
test("works against a local Ollama with no cloud keys", async ({ page }) => {
  test.skip(!process.env.E2E_OLLAMA, "set E2E_OLLAMA=1 with Ollama running");
  test.setTimeout(240_000);
  await page.goto("/");
  const doc = page.locator(".tiptap");
  await doc.locator("p").last().click();
  await page.keyboard.type("The capital of France is Paris. teh weather is nise today.");
  await doc.locator("p").last().click({ clickCount: 3 });

  await page
    .getByRole("toolbar", { name: "Selection formatting" })
    .getByRole("button", { name: "AI" })
    .click();
  await page.getByRole("menuitem", { name: "Fix spelling and grammar" }).click();

  const panel = page.getByRole("dialog", { name: /AI/ });
  await expect(panel.getByRole("button", { name: "Accept" })).toBeVisible({ timeout: 200_000 });
  const preview = await page.locator(".oe-ai-preview").textContent();
  await page.screenshot({ path: test.info().outputPath("ai.png") });
  await panel.getByRole("button", { name: "Accept" }).click();

  expect(preview).toMatch(/weather/i);
  expect(preview).not.toMatch(/\bteh\b/);
  await expect(doc.locator("p").last()).toContainText(/Paris/);
});
