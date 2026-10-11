# 6. Comments are marks plus an adapter; suggestions are tracked after the fact

Date: 2026-10-12
Status: accepted

## Decision

- **A comment's anchor is a mark in the document** carrying a thread id. Marks
  move with the text and sync through collaboration for free, which is what
  "stays anchored while others edit" needs. Threads may overlap.
- **The comment text lives outside the document**, behind `CommentsAdapter`.
  With collaboration on, the adapter is a map inside the shared Yjs document,
  with replies as a shared list so two simultaneous replies both survive.
  Otherwise it is in memory, with `onChange` for saving. A REST adapter covers
  the "my own API" case with optimistic updates and rollback.
- **Adding or removing an anchor is not undoable.** Otherwise Ctrl+Z after
  commenting would silently detach a thread.
- **Suggesting mode works by correcting transactions after they happen**
  (`appendTransaction`): inserted text gets an insertion mark, and deleted
  text is put back with a deletion mark. This needs no changes to how keys
  are handled.

## Trade-offs

- Suggestions track inline edits within one block. Splitting or joining
  blocks, multi-block pastes and formatting changes are applied directly,
  with any added text still marked. Full structural tracking would need a
  richer model than two marks.
- Composition input (IME) is untested with suggesting mode.
- Deleting commented text orphans its thread. The thread is kept and flagged.
- The comments panel is a fixed-width column; it does not align each thread
  with its text.
