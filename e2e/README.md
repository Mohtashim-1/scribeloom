# End-to-end tests

Playwright tests that drive the playground in a real browser, including two
windows editing the same document through the collaboration server.

```sh
pnpm e2e          # from the repo root: builds everything, then runs the tests
```

The config serves the built playground (port 4179) and starts its own
collaboration server (port 4180, in-memory database), so nothing else needs to
be running.

It uses the Chrome installed on your machine. To use Playwright's bundled
browser instead:

```sh
pnpm --filter @openedit/e2e exec playwright install chromium
PW_CHANNEL=chromium pnpm e2e
```

These tests are not part of `pnpm test`, which runs the fast unit tests only.
