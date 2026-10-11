/** What an action has to work with when it builds its prompt. */
export interface AIActionContext {
  /** The text the action applies to: the selection, or the current block. */
  text: string;
  /** Text of the document before the cursor, for context. */
  before: string;
  /** What the user typed, for actions that ask (a language, an instruction). */
  input: string;
}

/**
 * Something the AI can do with the text.
 */
export interface AIAction {
  id: string;
  label: string;
  /**
   * Where the result goes when accepted: in place of the text it was made
   * from, or after it.
   */
  placement: "replace" | "after";
  /** Whether the action asks the user for something first. */
  input?: "language" | "instruction";
  /** The task for the model. The surrounding system prompt is added for you. */
  prompt: (context: AIActionContext) => string;
}

/** Instructions sent with every request. */
export const SYSTEM_PROMPT =
  "You are a writing assistant built into a text editor. " +
  "Reply with only the resulting text: no introduction, no explanation, no quotation marks " +
  "around it, and no Markdown formatting. Keep the language of the text unless asked to translate.";

const on = (instruction: string) => (context: AIActionContext) =>
  `${instruction}\n\nText:\n${context.text}`;

/** The built-in actions. */
export const defaultAIActions: AIAction[] = [
  {
    id: "continue",
    label: "Continue writing",
    placement: "after",
    prompt: ({ before }) =>
      `Continue this text with one or two more sentences in the same style. Reply with only the continuation.\n\nText:\n${before}`,
  },
  {
    id: "improve",
    label: "Improve writing",
    placement: "replace",
    prompt: on("Improve the writing of this text. Keep its meaning and length roughly the same."),
  },
  {
    id: "shorten",
    label: "Make shorter",
    placement: "replace",
    prompt: on("Make this text shorter while keeping its key points."),
  },
  {
    id: "expand",
    label: "Make longer",
    placement: "replace",
    prompt: on("Expand this text with more detail, keeping its style."),
  },
  {
    id: "fixGrammar",
    label: "Fix spelling and grammar",
    placement: "replace",
    prompt: on("Correct the spelling and grammar of this text. Change nothing else."),
  },
  {
    id: "translate",
    label: "Translate",
    placement: "replace",
    input: "language",
    prompt: ({ text, input }) => `Translate this text into ${input}.\n\nText:\n${text}`,
  },
  {
    id: "summarize",
    label: "Summarize",
    placement: "after",
    prompt: on("Summarize this text in one short paragraph."),
  },
  {
    id: "custom",
    label: "Ask AI",
    placement: "replace",
    input: "instruction",
    prompt: ({ text, input, before }) =>
      text
        ? `${input}\n\nText:\n${text}`
        : `${input}\n\nFor context, the document so far:\n${before || "(empty)"}`,
  },
];
