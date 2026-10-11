# Comments and suggestions

Both are part of `RichTextEditor` by default. A panel beside the document
appears when there is something to show.

## Comments

Select text and press the comment button in the selection menu. The comment
is anchored to that text and moves with it as the document changes, including
when other people edit around it in real time.

Threads support replies, resolving and reopening, and deleting. If the
commented text is deleted, the thread stays and says so.

### Who is commenting

```tsx
<RichTextEditor comments={{ user: { name: "Ada", color: "#3e63dd" } }} />
```

With collaboration on, the collaboration user is used unless you set one.

### Where comments are stored

The document holds only the anchor (a mark carrying the thread id). The text
of the comments lives in an adapter:

| Situation        | Storage                                       |
| ---------------- | --------------------------------------------- |
| Collaboration on | The shared document, so comments sync with it |
| Otherwise        | Memory. Use `onChange` to save them yourself  |
| Your own API     | `restCommentsAdapter`                         |

Saving them yourself:

```ts
import { memoryCommentsAdapter } from "@openedit/extensions/comments";

comments: {
  adapter: memoryCommentsAdapter({
    initial: savedThreads,
    onChange: (threads) => saveThreads(threads),
  }),
}
```

Through a REST API:

```ts
import { restCommentsAdapter } from "@openedit/extensions/comments";

comments: {
  adapter: restCommentsAdapter({
    url: "/api/documents/42/threads",
    headers: () => ({ Authorization: `Bearer ${token}` }),
  }),
}
```

| Request                    | Body           | Meaning                         |
| -------------------------- | -------------- | ------------------------------- |
| `GET {url}`                |                | List all threads (a JSON array) |
| `POST {url}`               | a thread       | Create a thread                 |
| `POST {url}/{id}/comments` | a comment      | Add a reply                     |
| `PATCH {url}/{id}`         | `{ resolved }` | Resolve or reopen               |
| `DELETE {url}/{id}`        |                | Delete a thread                 |

Changes are applied locally at once and rolled back if the request fails.
Call `adapter.refresh()` to pick up other people's changes.

Comment text is rendered as plain text. Your server should still validate
what it stores and check who may read and write each thread.

### Building your own UI

```ts
import { getComments } from "@openedit/extensions/comments";

const comments = getComments(editor);
comments.addThread("Is this right?"); // on the current selection
comments.reply(threadId, "Yes");
comments.resolve(threadId);
comments.store.getState(); // { threads, activeThreadId, drafting }
```

## Suggestions

Press the pencil in the toolbar to switch on suggesting mode. From then on,
typing is marked as a proposed addition and deleting marks text as a proposed
deletion instead of removing it. Each suggestion appears in the panel with
accept and reject buttons, and there are "accept all" and "reject all".

```ts
import { getSuggestions } from "@openedit/extensions/suggestions";

const suggestions = getSuggestions(editor);
suggestions.setEnabled(true);
suggestions.accept(id);
suggestions.rejectAll();
```

### What is tracked

- Typing, deleting and replacing text within a block.
- Consecutive keystrokes are grouped into one suggestion.

Not tracked: changes to structure (splitting or joining blocks, pasting
several blocks) and to formatting. Those are applied directly; any text they
add is still marked as a suggestion. Input through an IME has not been
tested.
