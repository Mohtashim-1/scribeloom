import { defineConfig } from "@playwright/test";

const APP_PORT = 4179;
const COLLAB_PORT = 4180;

/*
 * Runs against a production build of the playground (`vite preview`) and a
 * collaboration server with an in-memory database, both started here. Build
 * first: `pnpm e2e` from the repo root does that.
 *
 * Uses the Chrome installed on this machine. Set PW_CHANNEL=chromium to use
 * Playwright's own browser instead (after `pnpm exec playwright install chromium`).
 */
/** The collaboration server the tests start, for the playground's `?collab=` parameter. */
export const COLLAB_URL = `ws://localhost:${COLLAB_PORT}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Generous: the collaboration tests open several windows each.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    channel: process.env.PW_CHANNEL ?? "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node ../apps/collab-server/dist/main.js",
      env: { PORT: String(COLLAB_PORT), DATABASE_PATH: ":memory:" },
      url: `http://localhost:${COLLAB_PORT}/health`,
      reuseExistingServer: false,
    },
    {
      command: `pnpm --filter @openedit/playground exec vite preview --port ${APP_PORT} --strictPort`,
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: false,
    },
  ],
});
