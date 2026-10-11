import { createEditor, type OpenEditor } from "@openedit/core";
import { getSlashMenu } from "@openedit/extensions";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ai, getAI, openaiCompatible, type AIProvider, type AIRequest } from "./index";

const editors: OpenEditor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

/** A provider that yields the given pieces and records what it was asked. */
function scripted(pieces: string[] | Error, requests: AIRequest[] = []) {
  const gate: { release?: () => void } = {};
  const provider: AIProvider = {
    async *stream(request) {
      requests.push(request);
      if (pieces instanceof Error) throw pieces;
      for (const piece of pieces) {
        if (piece === "<pause>") await new Promise<void>((resolve) => (gate.release = resolve));
        else yield piece;
      }
    },
  };
  return { provider, requests, gate };
}

function mount(provider: AIProvider, content = "<p>The quick brown fox.</p>") {
  const editor = createEditor({
    element: document.createElement("div"),
    features: ["basics", "slash-menu", ai({ provider })],
    content,
  });
  editors.push(editor);
  return { editor, api: getAI(editor)! };
}
const settled = (api: ReturnType<typeof getAI>) =>
  vi.waitFor(() => expect(["done", "error"]).toContain(api!.store.getState().status));
const select = (editor: OpenEditor, word: string) => {
  const from = editor.getText().indexOf(word) + 1;
  editor
    .chain()
    .setTextSelection({ from, to: from + word.length })
    .run();
};

describe("ai feature", () => {
  it("streams a preview, and changes the document only when accepted", async () => {
    const { provider, requests } = scripted(["slow ", "red"]);
    const { editor, api } = mount(provider);
    select(editor, "quick brown");

    api.run("improve");
    await settled(api);

    expect(api.store.getState()).toMatchObject({
      status: "done",
      output: "slow red",
      actionId: "improve",
    });
    expect(requests[0]!.prompt).toContain("Text:\nquick brown");
    expect(requests[0]!.system).toContain("writing assistant");
    // Still a preview: shown in the page, absent from the document.
    expect(editor.engine.view.dom.querySelector(".oe-ai-preview")?.textContent).toBe("slow red");
    expect(editor.getHTML()).toBe("<p>The quick brown fox.</p>");

    api.accept();

    expect(editor.getHTML()).toBe("<p>The slow red fox.</p>");
    expect(api.store.getState().status).toBe("idle");
    expect(editor.engine.view.dom.querySelector(".oe-ai-preview")).toBeNull();
  });

  it("discards without touching the document", async () => {
    const { editor, api } = mount(scripted(["nonsense"]).provider);
    select(editor, "fox");

    api.run("improve");
    await settled(api);
    api.discard();

    expect(editor.getHTML()).toBe("<p>The quick brown fox.</p>");
    expect(api.store.getState()).toMatchObject({ status: "idle", output: "" });
  });

  it("works on the current block when nothing is selected", async () => {
    const { provider, requests } = scripted(["Shorter."]);
    const { editor, api } = mount(provider, "<p>First.</p><p>The quick brown fox.</p>");
    editor.chain().setTextSelection(12).run();

    api.run("shorten");
    await settled(api);
    api.accept();

    expect(requests[0]!.prompt).toContain("Text:\nThe quick brown fox.");
    expect(editor.getHTML()).toBe("<p>First.</p><p>Shorter.</p>");
  });

  it("continues after the cursor, using the text before it as context", async () => {
    const { provider, requests } = scripted(["It jumped."]);
    const { editor, api } = mount(provider);
    editor.chain().focus("end").run();

    api.run("continue");
    await settled(api);
    api.accept();

    expect(requests[0]!.prompt).toContain("The quick brown fox.");
    expect(editor.getHTML()).toBe("<p>The quick brown fox. It jumped.</p>");
  });

  it("puts summaries after the text and turns blank lines into paragraphs", async () => {
    const { editor, api } = mount(scripted(["Line one.\n\nLine two."]).provider);
    select(editor, "The quick brown fox.");

    api.run("summarize");
    await settled(api);
    api.accept();

    expect(editor.getText()).toBe("The quick brown fox.\n\nLine one.\n\nLine two.");
  });

  it("asks for input when an action needs it", async () => {
    const { provider, requests } = scripted(["Le renard."]);
    const { editor, api } = mount(provider);
    select(editor, "The quick brown fox.");

    api.run("translate");
    expect(api.store.getState()).toMatchObject({ status: "asking", actionId: "translate" });
    expect(requests).toHaveLength(0);

    api.run("translate", "French");
    await settled(api);
    api.accept();

    expect(requests[0]!.prompt).toMatch(/^Translate this text into French\./);
    expect(editor.getHTML()).toBe("<p>Le renard.</p>");
  });

  it("can be stopped, keeping what arrived", async () => {
    const { provider, gate } = scripted(["Partial ", "<pause>", "never"]);
    const { editor, api } = mount(provider);
    select(editor, "fox");

    api.run("expand");
    await vi.waitFor(() => expect(api.store.getState().output).toBe("Partial "));
    api.stop();
    gate.release?.();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(api.store.getState()).toMatchObject({ status: "done", output: "Partial " });
    api.accept();
    expect(editor.getHTML()).toBe("<p>The quick brown Partial.</p>");
  });

  it("reports provider errors and can retry", async () => {
    const requests: AIRequest[] = [];
    let attempts = 0;
    const provider: AIProvider = {
      async *stream(request) {
        requests.push(request);
        if (attempts++ === 0) throw new Error("model not found");
        yield "ok";
      },
    };
    const { editor, api } = mount(provider);
    select(editor, "fox");

    api.run("improve");
    await settled(api);
    expect(api.store.getState()).toMatchObject({ status: "error", error: "model not found" });
    expect(editor.getHTML()).toBe("<p>The quick brown fox.</p>");

    api.retry();
    await vi.waitFor(() => expect(api.store.getState().status).toBe("done"));
    expect(api.store.getState().output).toBe("ok");
    expect(requests).toHaveLength(2);
  });

  it("follows its text when the document changes while generating", async () => {
    const { provider, gate } = scripted(["swift", "<pause>"]);
    const { editor, api } = mount(provider);
    select(editor, "quick");

    api.run("improve");
    await vi.waitFor(() => expect(api.store.getState().output).toBe("swift"));
    editor.chain().insertContentAt(1, "Look: ").run();
    gate.release?.();
    await settled(api);
    api.accept();

    expect(editor.getHTML()).toBe("<p>Look: The swift brown fox.</p>");
  });

  it("inserts the result as text, never as markup", async () => {
    const { editor, api } = mount(scripted(['<img src=x onerror="alert(1)"><b>bold</b>']).provider);
    select(editor, "fox");

    api.run("improve");
    await settled(api);
    api.accept();

    expect(editor.engine.view.dom.querySelector("img, b")).toBeNull();
    expect(editor.getText()).toContain('<img src=x onerror="alert(1)"><b>bold</b>');
  });

  it("adds AI entries to the slash menu", () => {
    const { editor } = mount(scripted([]).provider);
    editor.chain().focus("end").insertContent(" /ai").run();

    expect(
      getSlashMenu(editor)!
        .store.getState()
        .items.map((item) => item.id),
    ).toEqual(["ai-continue", "ai-ask"]);
  });

  it("requires the ai option when enabled by name", () => {
    expect(() => createEditor({ features: ["basics", "ai"] })).toThrow(/needs the `ai` option/);
  });
});

describe("openaiCompatible", () => {
  const sse = (chunks: string[], status = 200) =>
    new Response(
      new ReadableStream({
        start(controller) {
          chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk)));
          controller.close();
        },
      }),
      { status },
    );
  const delta = (content: string) =>
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
  const collect = async (stream: AsyncIterable<string>) => {
    let text = "";
    for await (const piece of stream) text += piece;
    return text;
  };

  it("sends a streaming chat request and reads the pieces, even when split across chunks", async () => {
    const whole =
      delta("Hel") +
      delta("lo") +
      ": keep-alive\n\n" +
      delta(" world") +
      "data: [DONE]\n\n" +
      delta("ignored");
    const fetchMock = vi.fn(async () =>
      sse([whole.slice(0, 25), whole.slice(25, 60), whole.slice(60)]),
    );
    const provider = openaiCompatible({
      baseUrl: "http://localhost:11434/v1/",
      model: "llama3.2",
      apiKey: "secret",
      temperature: 0.2,
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(await collect(provider.stream({ system: "sys", prompt: "hi" }))).toBe("Hello world");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    expect(JSON.parse(String(init.body))).toEqual({
      model: "llama3.2",
      stream: true,
      temperature: 0.2,
      messages: [
        { role: "system", content: "sys" },
        { role: "user", content: "hi" },
      ],
    });
  });

  it("uses the endpoint's first model when none is given, and sends no key", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/models")
        ? new Response(JSON.stringify({ data: [{ id: "local-model" }, { id: "other" }] }))
        : sse([delta("ok"), "data: [DONE]\n\n"]),
    );
    const provider = openaiCompatible({
      baseUrl: "http://x/v1",
      fetch: fetchMock as unknown as typeof fetch,
    });

    await collect(provider.stream({ system: "s", prompt: "p" }));
    await collect(provider.stream({ system: "s", prompt: "p" }));

    const completions = fetchMock.mock.calls.filter(([url]) => url.endsWith("/chat/completions"));
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("/models"))).toHaveLength(1);
    const [, init] = completions[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).model).toBe("local-model");
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("explains HTTP errors and unreachable endpoints", async () => {
    const refused = openaiCompatible({
      baseUrl: "http://x/v1",
      model: "m",
      fetch: (async () => new Response("model 'm' not found", { status: 404 })) as typeof fetch,
    });
    await expect(collect(refused.stream({ system: "s", prompt: "p" }))).rejects.toThrow(
      "The AI request failed (404): model 'm' not found",
    );

    const offline = openaiCompatible({
      baseUrl: "http://x/v1",
      model: "m",
      fetch: (async () => {
        throw new TypeError("Failed to fetch");
      }) as typeof fetch,
    });
    await expect(collect(offline.stream({ system: "s", prompt: "p" }))).rejects.toThrow(
      /Could not reach the AI endpoint at http:\/\/x\/v1/,
    );
  });

  // Runs against a real local server when one is up: OLLAMA_URL=http://localhost:11434/v1
  it.skipIf(!process.env.OLLAMA_URL)(
    "works against a local Ollama with no API key",
    async () => {
      const provider = openaiCompatible({
        baseUrl: process.env.OLLAMA_URL!,
        model: process.env.OLLAMA_MODEL,
      });
      const pieces: string[] = [];
      for await (const piece of provider.stream({
        system: "Reply with exactly one word.",
        prompt: "What is the capital of France?",
      })) {
        pieces.push(piece);
      }
      expect(pieces.length).toBeGreaterThan(0);
      expect(pieces.join("")).toMatch(/Paris/i);
    },
    180_000,
  );
});
