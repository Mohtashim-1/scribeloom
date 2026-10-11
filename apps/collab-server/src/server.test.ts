import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import * as Y from "yjs";
import {
  createCollabServer,
  memoryAdapter,
  postgresAdapter,
  sqliteAdapter,
  type CollabServer,
  type PersistenceAdapter,
} from "./index";

const cleanups: Array<() => unknown> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function start(options: Parameters<typeof createCollabServer>[0] = {}) {
  const server = await createCollabServer({ port: 0, saveDelay: 20, ...options });
  cleanups.push(() => server.close());
  return server;
}

/** Connects a client and resolves once it has synced, or rejects if refused. */
function connect(server: CollabServer, room: string, token?: string) {
  const document = new Y.Doc();
  let failed: string | null = null;
  // Node 20 has no global WebSocket, so hand the provider one.
  const socket = new HocuspocusProviderWebsocket({ url: server.url, WebSocketPolyfill: WebSocket });
  const provider = new HocuspocusProvider({
    websocketProvider: socket,
    name: room,
    document,
    token: token ?? null,
    onAuthenticationFailed: ({ reason }) => {
      failed = reason;
    },
  });
  provider.attach();
  cleanups.push(() => {
    provider.destroy();
    socket.destroy();
  });
  const text = document.getText("content");
  const synced = vi.waitFor(
    () => {
      if (failed) throw new Error(`refused: ${failed}`);
      expect(provider.synced).toBe(true);
    },
    { timeout: 5000 },
  );
  return { provider, socket, document, text, synced };
}

describe("collab server", () => {
  it("fails to start when the port is taken", async () => {
    const server = await start();
    await expect(createCollabServer({ port: server.port })).rejects.toThrow(/EADDRINUSE/);
  });

  it("syncs changes between two clients in the same room", async () => {
    const server = await start();
    const a = connect(server, "room-1");
    const b = connect(server, "room-1");
    await Promise.all([a.synced, b.synced]);

    a.text.insert(0, "hello");

    await vi.waitFor(() => expect(b.text.toString()).toBe("hello"));
  });

  it("keeps rooms separate", async () => {
    const server = await start();
    const a = connect(server, "room-1");
    const other = connect(server, "room-2");
    await Promise.all([a.synced, other.synced]);

    a.text.insert(0, "private");
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(other.text.toString()).toBe("");
  });

  it("merges edits made while a client was disconnected", async () => {
    const server = await start();
    const a = connect(server, "room-1");
    const b = connect(server, "room-1");
    await Promise.all([a.synced, b.synced]);
    a.text.insert(0, "shared");
    await vi.waitFor(() => expect(b.text.toString()).toBe("shared"));

    b.socket.disconnect();
    await vi.waitFor(() => expect(b.socket.status).toBe("disconnected"));
    b.text.insert(b.text.length, " + offline edit");
    a.text.insert(0, "online edit + ");
    void b.socket.connect();

    // Reconnecting backs off for a moment first.
    await vi.waitFor(
      () => {
        expect(a.text.toString()).toBe("online edit + shared + offline edit");
        expect(b.text.toString()).toBe("online edit + shared + offline edit");
      },
      { timeout: 10_000 },
    );
  });

  it("answers health checks", async () => {
    const server = await start();
    const response = await fetch(`http://127.0.0.1:${server.port}/health`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });
});

describe("auth hook", () => {
  const authenticate = vi.fn(({ token }: { token: string }) => {
    if (token === "viewer") return { readOnly: true };
    if (token !== "secret") throw new Error("nope");
  });

  it("lets in clients with a valid token and passes the room", async () => {
    const server = await start({ authenticate });
    const client = connect(server, "room-1", "secret");

    await client.synced;

    expect(authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ token: "secret", room: "room-1" }),
    );
  });

  it("refuses a wrong token", async () => {
    const server = await start({ authenticate });
    const client = connect(server, "room-1", "wrong");

    await expect(client.synced).rejects.toThrow(/refused/);
    expect(client.provider.synced).toBe(false);
  });

  it("does not sync clients that send no token", async () => {
    const server = await start({ authenticate });
    const allowed = connect(server, "room-1", "secret");
    await allowed.synced;
    allowed.text.insert(0, "confidential");

    const anonymous = connect(server, "room-1");
    anonymous.synced.catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(anonymous.provider.synced).toBe(false);
    expect(anonymous.text.toString()).toBe("");
  });

  it("discards changes from read-only clients", async () => {
    const server = await start({ authenticate });
    const editor = connect(server, "room-1", "secret");
    const viewer = connect(server, "room-1", "viewer");
    await Promise.all([editor.synced, viewer.synced]);

    editor.text.insert(0, "from editor");
    await vi.waitFor(() => expect(viewer.text.toString()).toBe("from editor"));
    viewer.text.insert(0, "from viewer ");
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(editor.text.toString()).toBe("from editor");
  });
});

describe("persistence", () => {
  async function roundTrip(makeAdapter: () => PersistenceAdapter | Promise<PersistenceAdapter>) {
    const room = `room-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const first = await start({ persistence: await makeAdapter() });
    const writer = connect(first, room);
    await writer.synced;
    writer.text.insert(0, "survives a restart");
    // Let the debounced save run, then stop the server completely.
    await new Promise((resolve) => setTimeout(resolve, 300));
    writer.socket.destroy();
    await first.close();

    const second = await start({ persistence: await makeAdapter() });
    const reader = connect(second, room);
    await reader.synced;
    return reader.text.toString();
  }

  it("adapters return null for unknown rooms and round-trip bytes", async () => {
    for (const adapter of [memoryAdapter(), sqliteAdapter(":memory:")]) {
      expect(await adapter.load("missing")).toBeNull();
      await adapter.store("a", new Uint8Array([1, 2, 3]));
      await adapter.store("a", new Uint8Array([4, 5]));
      expect(Array.from((await adapter.load("a"))!)).toEqual([4, 5]);
      await adapter.close?.();
    }
  });

  it("SQLite keeps documents across a server restart", async () => {
    const directory = mkdtempSync(join(tmpdir(), "openedit-collab-"));
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
    const file = join(directory, "nested", "documents.sqlite");

    expect(await roundTrip(() => sqliteAdapter(file))).toBe("survives a restart");
  });

  it("the in-memory store does not", async () => {
    expect(await roundTrip(() => memoryAdapter())).toBe("");
  });

  // Needs a database: TEST_POSTGRES_URL=postgres://... pnpm test
  it.skipIf(!process.env.TEST_POSTGRES_URL)(
    "PostgreSQL keeps documents across a server restart",
    async () => {
      const url = process.env.TEST_POSTGRES_URL!;
      expect(await roundTrip(() => postgresAdapter(url))).toBe("survives a restart");
    },
  );
});
