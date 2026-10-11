import { defineConfig } from "@playwright/test";

const APP_PORT = 4179;
const COLLAB_PORT = 4180;

/*
 * Runs against the playground (Vite dev server) and a collaboration server
 * with an in-memory database, both started here. Build the packages first:
 * `pnpm e2e` from the repo root does that.
 *
 * Uses the Chrome installed on this machine. Set PW_CHANNEL=chromium to use
 * Playwright's own browser instead (after `pnpm exec playwright install chromium`).
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
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
      command: `pnpm --filter @openedit/playground exec vite --port ${APP_PORT} --strictPort`,
      env: { VITE_COLLAB_URL: `ws://localhost:${COLLAB_PORT}` },
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: false,
    },
  ],
});
