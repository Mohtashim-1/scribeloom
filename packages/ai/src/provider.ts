/** What a provider is asked to write. */
export interface AIRequest {
  /** Standing instructions for the model. */
  system: string;
  /** The task, including the text to work on. */
  prompt: string;
  /** Aborts the request when the user stops it. */
  signal?: AbortSignal;
}

/**
 * A source of AI text. Implement this to connect any model or service:
 * `stream` yields the answer piece by piece as it is generated.
 *
 * @example
 * ```ts
 * const echo: AIProvider = {
 *   async *stream({ prompt }) {
 *     for (const word of prompt.split(" ")) yield word + " ";
 *   },
 * };
 * ```
 */
export interface AIProvider {
  stream(request: AIRequest): AsyncIterable<string>;
}

/**
 * Options for {@link openaiCompatible}.
 */
export interface OpenAICompatibleOptions {
  /**
   * Base URL of the API, up to and including `/v1`.
   * Ollama: `http://localhost:11434/v1`. LM Studio: `http://localhost:1234/v1`.
   */
  baseUrl: string;
  /**
   * Model to use. If left out, the first model the endpoint lists is used,
   * which suits a local server with one model loaded.
   */
  model?: string;
  /** API key, sent as a bearer token. Local servers usually need none. */
  apiKey?: string;
  /** Extra request headers. */
  headers?: Record<string, string>;
  /** Sampling temperature. @defaultValue the server's default */
  temperature?: number;
  /** Replacement for the global `fetch`, e.g. to route through your own server. */
  fetch?: typeof fetch;
}

/**
 * Connects to any server that speaks the OpenAI chat completions API with
 * streaming: Ollama, LM Studio, vLLM, llama.cpp, OpenAI and others.
 *
 * Requests go straight from the browser to `baseUrl`, and nowhere else. An
 * API key given here is visible to anyone using the page, so for a hosted
 * service, point `baseUrl` at a small proxy of your own that adds the key.
 */
export function openaiCompatible(options: OpenAICompatibleOptions): AIProvider {
  const send = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const base = options.baseUrl.replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json",
    ...(options.apiKey && { Authorization: `Bearer ${options.apiKey}` }),
    ...options.headers,
  };
  let resolvedModel: Promise<string> | undefined;

  const fail = async (response: Response, what: string) => {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    return new Error(`${what} failed (${response.status})${detail ? `: ${detail}` : ""}`);
  };

  const model = (signal?: AbortSignal) =>
    (resolvedModel ??= (async () => {
      if (options.model) return options.model;
      const response = await send(`${base}/models`, { headers, signal });
      if (!response.ok) throw await fail(response, "Listing models");
      const first = ((await response.json()) as { data?: Array<{ id?: string }> }).data?.[0]?.id;
      if (!first) throw new Error("The AI endpoint lists no models. Set `model` explicitly.");
      return first;
    })().catch((error: unknown) => {
      // Try again on the next request instead of caching the failure.
      resolvedModel = undefined;
      throw error;
    }));

  return {
    async *stream({ system, prompt, signal }) {
      let response: Response;
      try {
        response = await send(`${base}/chat/completions`, {
          method: "POST",
          headers,
          signal,
          body: JSON.stringify({
            model: await model(signal),
            stream: true,
            ...(options.temperature !== undefined && { temperature: options.temperature }),
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt },
            ],
          }),
        });
      } catch (error) {
        if (signal?.aborted) return;
        throw new Error(
          `Could not reach the AI endpoint at ${base}. Is it running and reachable from this page?`,
          { cause: error },
        );
      }
      if (!response.ok) throw await fail(response, "The AI request");
      if (!response.body) throw new Error("The AI endpoint returned no response body.");

      // Server-sent events: lines of `data: {json}`, ending with `data: [DONE]`.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffered = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffered += decoder.decode(value, { stream: true });
          const lines = buffered.split("\n");
          buffered = lines.pop() ?? "";
          for (const line of lines) {
            const data = line.trim().replace(/^data:\s*/, "");
            if (!line.trim().startsWith("data:") || !data) continue;
            if (data === "[DONE]") return;
            let piece: unknown;
            try {
              piece = (JSON.parse(data) as { choices?: Array<{ delta?: { content?: unknown } }> })
                .choices?.[0]?.delta?.content;
            } catch {
              continue; // A keep-alive or a partial line; not ours to fail on.
            }
            if (typeof piece === "string" && piece) yield piece;
          }
        }
      } catch (error) {
        if (!signal?.aborted) throw error;
      } finally {
        reader.cancel().catch(() => {});
      }
    },
  };
}
