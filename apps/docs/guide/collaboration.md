# Collaboration and self-hosting

Several people edit one document at the same time, with a named cursor for
each. It runs through a server you host: there is no cloud service involved.

## In the editor

```tsx
import "@openedit/extensions/collab";
import { RichTextEditor } from "@openedit/ui";

<RichTextEditor
  content="<p>Used only if the shared document is still empty</p>"
  collab={{
    url: "ws://localhost:1234",
    room: "doc-1",
    user: { name: "Ada", color: "#3e63dd" },
    token: () => getSessionToken(),
  }}
/>;
```

| Option    | Meaning                                                              |
| --------- | -------------------------------------------------------------------- |
| `url`     | WebSocket URL of your server                                         |
| `room`    | Name of the document. Everyone in the same room edits together       |
| `user`    | The local user's `name` and cursor `color` (a hex value)             |
| `token`   | Sent to the server's auth hook. A function is called on each connect |
| `offline` | Keep a copy in the browser. Default `true`                           |

What you get:

- **Live sync.** Conflicting edits merge automatically.
- **Cursors and selections** of other people, labelled with their name.
- **Presence.** The toolbar shows who is here and whether you are connected.
- **Offline.** The document opens and can be edited without a connection,
  and merges when it returns.
- **Per-user undo.** Undo only reverts your own changes.

`collabColorFor(seed)` from `@openedit/extensions/collab` picks a stable
colour for a name or user id.

### Things to know

- `content` seeds a room only if it is empty after the first sync. Two people
  opening a brand-new room at the same instant can both seed it. Create
  documents on the server if that matters.
- Names and colours of other people come from their browsers. They are
  validated before use, but treat them as user input.
- Comments are stored in the shared document when collaboration is on, so
  they sync as well.

## Running the server

The reference server is in `apps/collab-server`. With Docker, from the
repository root:

```sh
docker compose up
```

Or with Node 20 or newer:

```sh
pnpm --filter @openedit/collab-server build
pnpm --filter @openedit/collab-server start
```

Either way it listens on `ws://localhost:1234`.

### Configuration

| Variable        | Meaning                                                | Default                  |
| --------------- | ------------------------------------------------------ | ------------------------ |
| `PORT`          | Port to listen on                                      | `1234`                   |
| `DATABASE_PATH` | SQLite file for documents                              | `./data/openedit.sqlite` |
| `DATABASE_URL`  | `postgres://...` to use PostgreSQL instead             | not set                  |
| `COLLAB_TOKEN`  | Shared secret every client must send as `collab.token` | not set                  |

`GET /health` answers `ok`. In Docker, documents live in the `collab-data`
volume and the process runs as a non-root user.

### Security

::: danger No authentication by default
Without `COLLAB_TOKEN` or an auth hook, anyone who can reach the port can
read and edit every document. That is fine on your own machine and nowhere
else.
:::

`COLLAB_TOKEN` is one secret shared by all clients, which suits a private
deployment. For real users, write an auth hook:

```ts
import { createCollabServer, sqliteAdapter } from "@openedit/collab-server";

await createCollabServer({
  port: 1234,
  persistence: sqliteAdapter("./data/documents.sqlite"),
  authenticate: async ({ token, room, headers }) => {
    const session = await verifySession(token); // throw to refuse
    if (!session.canOpen(room)) throw new Error("Forbidden");
    return { readOnly: session.role === "viewer" };
  },
});
```

Also:

- Serve it over TLS (`wss://`) behind a reverse proxy. Tokens and document
  contents are otherwise sent in the clear.
- Room names are chosen by clients. Check in your hook that the user may open
  the room they ask for.

### Storage

Storage is a three-method interface, so documents can live anywhere:

```ts
interface PersistenceAdapter {
  load(room: string): Promise<Uint8Array | null>;
  store(room: string, state: Uint8Array): Promise<void>;
  close?(): Promise<void>;
}
```

Included: `sqliteAdapter(path)` (the default), `postgresAdapter(url)` and
`memoryAdapter()` for tests.

### Limits

- One server process. Several behind a load balancer need a shared pub/sub
  layer, which is not set up here.
- No version history yet.
