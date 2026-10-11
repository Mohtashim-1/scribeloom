# Collaboration server

The reference server for OpenEdit's `collab` feature:
[Hocuspocus](https://github.com/ueberdosis/hocuspocus) (MIT) with pluggable
storage and an auth hook. Self-hosted; no cloud service or API key involved.

## Run it

With Docker, from the repository root:

```sh
docker compose up
```

Or with Node 20+:

```sh
pnpm install
pnpm --filter @openedit/collab-server build
pnpm --filter @openedit/collab-server start
```

Either way it listens on `ws://localhost:1234`. Point the editor at it:

```ts
collab: { url: "ws://localhost:1234", room: "doc-1", user: { name: "Ada", color: "#3e63dd" } }
```

## Configuration

Environment variables, all optional:

| Variable        | Meaning                                                       | Default                   |
| --------------- | ------------------------------------------------------------- | ------------------------- |
| `PORT`          | Port to listen on                                             | `1234`                    |
| `DATABASE_PATH` | SQLite file for documents                                     | `./data/openedit.sqlite`  |
| `DATABASE_URL`  | `postgres://...` to store documents in PostgreSQL instead     | not set                   |
| `COLLAB_TOKEN`  | Shared secret every client must send as `collab.token`        | not set (no auth)         |

`GET /health` answers `ok`. In Docker, documents live in the `collab-data`
volume, and the container runs as a non-root user.

## Security

**Without `COLLAB_TOKEN` or an auth hook, anyone who can reach the port can
read and edit every document.** That is fine on your own machine and nowhere
else. The server says so at startup.

`COLLAB_TOKEN` is one secret shared by all clients, which suits a private
deployment. For real users you want the auth hook below. Also:

- Serve it over TLS (`wss://`) behind a reverse proxy; tokens and document
  contents are otherwise sent in the clear.
- Room names are chosen by clients. Check in your auth hook that the user may
  open the room they ask for.

## Auth hook and custom storage

Use the server as a library when you need per-user rules or your own storage:

```ts
import { createCollabServer, sqliteAdapter } from "@openedit/collab-server";

await createCollabServer({
  port: 1234,
  persistence: sqliteAdapter("./data/documents.sqlite"),
  authenticate: async ({ token, room, headers }) => {
    const session = await verifySession(token); // throw to refuse the connection
    if (!session.canOpen(room)) throw new Error("Forbidden");
    return { readOnly: session.role === "viewer" };
  },
});
```

`authenticate` receives the client's token, the room and the handshake
headers. Throwing refuses the connection; returning `{ readOnly: true }` lets
the client follow the document without being able to change it.

Storage is a three-method interface:

```ts
interface PersistenceAdapter {
  load(room: string): Promise<Uint8Array | null>;
  store(room: string, state: Uint8Array): Promise<void>;
  close?(): Promise<void>;
}
```

Included: `sqliteAdapter(path)` (the default), `postgresAdapter(url)` and
`memoryAdapter()` for tests. A document is stored as one binary value, the
full Yjs state, saved a couple of seconds after the last change.

## Tests

```sh
pnpm --filter @openedit/collab-server test

# include the PostgreSQL adapter
TEST_POSTGRES_URL=postgres://user:password@localhost:5432/db pnpm --filter @openedit/collab-server test
```

## Limits

- One server process. Running several behind a load balancer needs a shared
  pub/sub layer (Hocuspocus has a Redis extension), which is not set up here.
- No version history yet.
- Uses Hocuspocus 3.4, the last line that supports Node 20. Version 4 needs
  Node 22.

## License

MIT
