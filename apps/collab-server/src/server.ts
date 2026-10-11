import type { IncomingHttpHeaders } from "node:http";
import { Database } from "@hocuspocus/extension-database";
import { Server } from "@hocuspocus/server";
import { memoryAdapter, type PersistenceAdapter } from "./persistence";

/** What the auth hook gets to decide with. */
export interface AuthRequest {
  /** The token the client sent (`collab.token` in the editor). Empty if none. */
  token: string;
  /** The document the client wants to open. */
  room: string;
  /** HTTP headers of the WebSocket handshake, e.g. for cookies. */
  headers: IncomingHttpHeaders;
}

/** Outcome of a successful authentication. */
export interface AuthResult {
  /** Let the client read the document but reject its changes. */
  readOnly?: boolean;
}

/**
 * Decides whether a client may open a room. Throw (or reject) to refuse.
 *
 * @example
 * ```ts
 * const authenticate: Authenticate = async ({ token, room }) => {
 *   const session = await verifyJwt(token); // throws when invalid
 *   if (!session.rooms.includes(room)) throw new Error("Forbidden");
 *   return { readOnly: session.role === "viewer" };
 * };
 * ```
 */
export type Authenticate = (request: AuthRequest) => Promise<AuthResult | void> | AuthResult | void;

/**
 * Options for {@link createCollabServer}.
 */
export interface CollabServerOptions {
  /** Port to listen on. `0` picks a free one. @defaultValue `1234` */
  port?: number;
  /** Where documents are stored. @defaultValue an in-memory store */
  persistence?: PersistenceAdapter;
  /**
   * Auth hook. Without it, anyone who can reach the server can read and edit
   * every room.
   */
  authenticate?: Authenticate;
  /** Milliseconds to wait after a change before saving. @defaultValue `2000` */
  saveDelay?: number;
  /** Largest accepted WebSocket message, in bytes. @defaultValue 8 MB */
  maxMessageSize?: number;
}

/** A running collaboration server. */
export interface CollabServer {
  /** The port actually bound, useful with `port: 0`. */
  port: number;
  /** WebSocket URL for local clients. */
  url: string;
  /** Saves open documents, disconnects everyone and frees the port. */
  close: () => Promise<void>;
}

const MAX_ROOM_NAME_LENGTH = 200;

/**
 * Starts a collaboration server: Hocuspocus with a persistence adapter and
 * an optional auth hook. `GET /health` answers `ok` for health checks.
 */
export async function createCollabServer(options: CollabServerOptions = {}): Promise<CollabServer> {
  const persistence = options.persistence ?? memoryAdapter();
  const { authenticate } = options;

  const server = new Server(
    {
      name: "openedit-collab",
      quiet: true,
      stopOnSignals: false,
      port: options.port ?? 1234,
      debounce: options.saveDelay ?? 2000,
      extensions: [
        new Database({
          fetch: ({ documentName }) => persistence.load(documentName),
          store: ({ documentName, state }) => persistence.store(documentName, state),
        }),
      ],
      async onConnect({ documentName }) {
        if (!documentName || documentName.length > MAX_ROOM_NAME_LENGTH) {
          throw new Error("Invalid room name.");
        }
      },
      // Defining this hook is what makes the server demand a token.
      ...(authenticate && {
        async onAuthenticate({ token, documentName, requestHeaders, connectionConfig }) {
          const result = await authenticate({ token, room: documentName, headers: requestHeaders });
          if (result?.readOnly) connectionConfig.readOnly = true;
        },
      }),
      async onRequest({ request, response }) {
        if (request.url === "/health") {
          response.writeHead(200, { "Content-Type": "text/plain" });
          response.end("ok");
          // Rejecting tells Hocuspocus the request has been handled.
          throw null;
        }
      },
    },
    { maxPayload: options.maxMessageSize ?? 8 * 1024 * 1024 },
  );

  // Hocuspocus leaves its promise pending when the port cannot be bound.
  await new Promise<void>((resolve, reject) => {
    server.httpServer.once("error", reject);
    void server.listen().then(() => {
      server.httpServer.off("error", reject);
      resolve();
    });
  });
  const { port } = server.address;

  let closed: Promise<void> | undefined;
  return {
    port,
    url: `ws://127.0.0.1:${port}`,
    // Safe to call more than once.
    close: () =>
      (closed ??= (async () => {
        await server.destroy();
        await persistence.close?.();
      })()),
  };
}
