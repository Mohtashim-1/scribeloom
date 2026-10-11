import { timingSafeEqual } from "node:crypto";
import { postgresAdapter, sqliteAdapter } from "./persistence";
import { createCollabServer, type Authenticate } from "./server";

/*
 * Entry point for the reference server. Configuration, all optional:
 *
 *   PORT           port to listen on (default 1234)
 *   DATABASE_URL   postgres://... to store documents in PostgreSQL
 *   DATABASE_PATH  SQLite file, used when DATABASE_URL is not set
 *                  (default ./data/openedit.sqlite)
 *   COLLAB_TOKEN   shared secret clients must send as their token
 *
 * For per-user or per-room access rules, import createCollabServer from this
 * package and pass your own `authenticate` function instead.
 */

const { PORT, DATABASE_URL, DATABASE_PATH, COLLAB_TOKEN } = process.env;

function sharedSecret(secret: string): Authenticate {
  const expected = Buffer.from(secret);
  return ({ token }) => {
    const given = Buffer.from(token);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new Error("Invalid token.");
    }
  };
}

const persistence = DATABASE_URL
  ? await postgresAdapter(DATABASE_URL)
  : sqliteAdapter(DATABASE_PATH ?? "./data/openedit.sqlite");

const server = await createCollabServer({
  port: PORT ? Number(PORT) : 1234,
  persistence,
  authenticate: COLLAB_TOKEN ? sharedSecret(COLLAB_TOKEN) : undefined,
});

console.log(`OpenEdit collaboration server listening on port ${server.port}`);
console.log(
  `  storage: ${DATABASE_URL ? "PostgreSQL" : `SQLite (${DATABASE_PATH ?? "./data/openedit.sqlite"})`}`,
);
if (!COLLAB_TOKEN) {
  console.warn("  auth: none. Anyone who can reach this port can read and edit every document.");
  console.warn("        Set COLLAB_TOKEN, or pass your own authenticate function.");
} else {
  console.log("  auth: shared token (COLLAB_TOKEN)");
}

let closing = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    // Saves open documents before exiting.
    void server.close().finally(() => process.exit(0));
  });
}
