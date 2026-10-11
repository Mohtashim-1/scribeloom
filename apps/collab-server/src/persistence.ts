import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

/**
 * Where the server keeps documents. Implement this to store them anywhere.
 *
 * A document is an opaque binary blob (the full Yjs state). `store` is called
 * with the whole document, debounced, whenever it changes.
 */
export interface PersistenceAdapter {
  /** Returns the stored document, or `null` if there is none yet. */
  load(room: string): Promise<Uint8Array | null>;
  /** Saves the document, replacing any previous version. */
  store(room: string, state: Uint8Array): Promise<void>;
  /** Releases connections and file handles. */
  close?(): Promise<void>;
}

/**
 * Keeps documents in memory. They are lost when the server stops, so use it
 * for tests and demos only.
 */
export function memoryAdapter(): PersistenceAdapter {
  const documents = new Map<string, Uint8Array>();
  return {
    load: async (room) => documents.get(room) ?? null,
    store: async (room, state) => {
      documents.set(room, state);
    },
  };
}

/**
 * Stores documents in a SQLite file. The default, and enough for a single
 * server.
 *
 * @param path - Database file. Created along with its folder if missing.
 *   Pass `":memory:"` for an in-memory database.
 */
export function sqliteAdapter(path: string): PersistenceAdapter {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const database = new Database(path);
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      name TEXT PRIMARY KEY,
      data BLOB NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  const select = database.prepare<[string], { data: Buffer }>(
    "SELECT data FROM documents WHERE name = ?",
  );
  const upsert = database.prepare(`
    INSERT INTO documents (name, data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT (name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `);
  return {
    load: async (room) => {
      const row = select.get(room);
      return row ? new Uint8Array(row.data) : null;
    },
    store: async (room, state) => {
      upsert.run(room, Buffer.from(state), Date.now());
    },
    close: async () => {
      database.close();
    },
  };
}

/**
 * Stores documents in PostgreSQL, for running more than one server or when
 * you already operate a Postgres database. Needs the optional `pg` package.
 *
 * @param connectionString - e.g. `postgres://user:password@host:5432/database`
 */
export async function postgresAdapter(connectionString: string): Promise<PersistenceAdapter> {
  const { default: pg } = await import("pg").catch(() => {
    throw new Error('The Postgres adapter needs the "pg" package. Install it with: pnpm add pg');
  });
  const pool = new pg.Pool({ connectionString });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      name TEXT PRIMARY KEY,
      data BYTEA NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  return {
    load: async (room) => {
      const result = await pool.query<{ data: Buffer }>(
        "SELECT data FROM documents WHERE name = $1",
        [room],
      );
      const row = result.rows[0];
      return row ? new Uint8Array(row.data) : null;
    },
    store: async (room, state) => {
      await pool.query(
        `INSERT INTO documents (name, data, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
        [room, Buffer.from(state)],
      );
    },
    close: async () => {
      await pool.end();
    },
  };
}
