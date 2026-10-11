# @openedit/ai

See the [guide](../guide/ai) for usage.

| Export                                    | Meaning                                       |
| ----------------------------------------- | --------------------------------------------- |
| `ai({ provider, actions, systemPrompt })` | The `ai` feature                              |
| `getAI(editor)`                           | The handle, or `null` when the feature is off |
| `openaiCompatible(options)`               | A provider for OpenAI-compatible endpoints    |
| `defaultAIActions`, `SYSTEM_PROMPT`       | The built-in actions and instructions         |

## Handle

| Member                  | Meaning                                           |
| ----------------------- | ------------------------------------------------- |
| `store`                 | State: `{ status, actionId, output, error }`      |
| `actions`               | The configured actions                            |
| `run(actionId, input?)` | Start an action on the selection or current block |
| `stop()`                | Stop generating, keeping what arrived             |
| `retry()`               | Run the same action again                         |
| `accept()`              | Put the result into the document                  |
| `discard()`             | Throw the result away                             |
| `getRect()`             | Where the text and its preview are on screen      |

`status` is `idle`, `asking` (waiting for a typed instruction or language),
`streaming`, `done` or `error`.

## Types

```ts
interface AIProvider {
  stream(request: { system: string; prompt: string; signal?: AbortSignal }): AsyncIterable<string>;
}

interface AIAction {
  id: string;
  label: string;
  placement: "replace" | "after";
  input?: "language" | "instruction";
  prompt(context: { text: string; before: string; input: string }): string;
}
```
