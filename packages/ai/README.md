# @openedit/ai

AI writing assistance for OpenEdit, for any model you choose. Nothing is sent
anywhere unless you configure a provider, and then only when the user runs an
action.

```tsx
import { openaiCompatible } from "@openedit/ai";
import { RichTextEditor } from "@openedit/ui";

// A local Ollama: no key, no account.
const provider = openaiCompatible({ baseUrl: "http://localhost:11434/v1" });

<RichTextEditor ai={{ provider }} />;
```

- Works with any OpenAI-compatible endpoint: Ollama, LM Studio, vLLM,
  llama.cpp, or a hosted service behind your own proxy.
- Actions: continue writing, improve, shorten, expand, fix spelling and
  grammar, translate, summarize, and a free-form instruction.
- The result streams into the document as a preview. Nothing changes until
  the user accepts it.
- Results are inserted as plain text, never as markup.
- Bring your own model by implementing one method, `stream()`.

**API keys given to `openaiCompatible` are visible in the browser.** For a
hosted service, point `baseUrl` at a proxy of your own that adds the key.

See the [AI guide](../../apps/docs/guide/ai.md).

## License

MIT
