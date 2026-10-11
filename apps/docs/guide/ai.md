# AI

Writing assistance that works with any model you choose. Nothing is sent
anywhere unless you configure a provider, and then only when the user runs an
action.

## Setup

```tsx
import { openaiCompatible } from "@openedit/ai";
import { RichTextEditor } from "@openedit/ui";

const provider = openaiCompatible({ baseUrl: "http://localhost:11434/v1" });

<RichTextEditor ai={{ provider }} />;
```

That example uses a local [Ollama](https://ollama.com), which needs no key
and no account. `openaiCompatible` works with any server that speaks the
OpenAI chat completions API with streaming:

| Server           | `baseUrl`                            |
| ---------------- | ------------------------------------ |
| Ollama           | `http://localhost:11434/v1`          |
| LM Studio        | `http://localhost:1234/v1`           |
| vLLM, llama.cpp  | wherever you run it, ending in `/v1` |
| A hosted service | your own proxy (see below)           |

| Option                            | Meaning                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| `baseUrl`                         | Base URL, up to and including `/v1`                               |
| `model`                           | Model name. If left out, the first model the server lists is used |
| `apiKey`                          | Sent as a bearer token                                            |
| `headers`, `temperature`, `fetch` | Extra headers; sampling temperature; a replacement `fetch`        |

::: warning Keys in the browser
Requests go straight from the browser to `baseUrl`. An API key given here is
visible to anyone using the page. For a hosted service, point `baseUrl` at a
small proxy of your own that adds the key and checks who is asking.
:::

## Using it

Select text and open **AI** in the selection menu, or type `/` and choose
"Continue writing" or "Ask AI".

| Action                                                               | Result goes                                 |
| -------------------------------------------------------------------- | ------------------------------------------- |
| Continue writing                                                     | after the cursor                            |
| Improve writing, Make shorter, Make longer, Fix spelling and grammar | in place of the text                        |
| Translate                                                            | in place of the text                        |
| Summarize                                                            | after the text                              |
| Ask AI                                                               | in place of the selection, or at the cursor |

With nothing selected, an action applies to the block the cursor is in.

The result streams into the document as a **preview** next to the original.
Nothing changes until the user presses Accept. Discard throws it away, and
Try again runs it once more. Enter accepts and Escape discards.

Results are inserted as plain text. Blank lines become paragraphs; nothing is
interpreted as HTML.

## Your own provider

A provider is one method that yields text as it is generated:

```ts
import type { AIProvider } from "@openedit/ai";

const provider: AIProvider = {
  async *stream({ system, prompt, signal }) {
    const response = await fetch("/api/write", {
      method: "POST",
      body: JSON.stringify({ system, prompt }),
      signal,
    });
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  },
};
```

## Your own actions

```ts
ai: {
  provider,
  actions: (defaults) => [
    ...defaults,
    {
      id: "formal",
      label: "Make formal",
      placement: "replace",
      prompt: ({ text }) => `Rewrite this in a formal tone.\n\nText:\n${text}`,
    },
  ],
}
```

`systemPrompt` replaces the standing instructions sent with every request.

## From code

```ts
import { getAI } from "@openedit/ai";

const ai = getAI(editor);
ai.run("improve");
ai.store.getState(); // { status, actionId, output, error }
ai.accept();
```
