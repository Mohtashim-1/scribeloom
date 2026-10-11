# Collaboration server

`apps/collab-server` in the repository. See the
[guide](../guide/collaboration) for running and securing it.

## createCollabServer(options)

| Option           | Default   | Meaning                                           |
| ---------------- | --------- | ------------------------------------------------- |
| `port`           | `1234`    | Port to listen on. `0` picks a free one           |
| `persistence`    | in memory | Where documents are stored                        |
| `authenticate`   | none      | Auth hook. Without it the server is open          |
| `saveDelay`      | `2000`    | Milliseconds to wait after a change before saving |
| `maxMessageSize` | 8 MB      | Largest accepted WebSocket message                |

Returns `{ port, url, close() }`. `close()` saves open documents, disconnects
everyone and frees the port.

## authenticate({ token, room, headers })

Throw to refuse the connection. Return `{ readOnly: true }` to let the client
follow the document without being able to change it.

## Persistence

`sqliteAdapter(path)`, `postgresAdapter(connectionString)`, `memoryAdapter()`,
or your own object with `load(room)`, `store(room, state)` and an optional
`close()`. A document is stored as one binary value.

## Built on

[Hocuspocus](https://github.com/ueberdosis/hocuspocus) 3.4 and Yjs, both MIT.
Version 3.4 is the last Hocuspocus line that supports Node 20.
