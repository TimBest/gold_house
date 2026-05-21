// Global setup for bun test.
// Each test that needs to mock outbound HTTP should override globalThis.fetch
// and restore it in afterEach. We intentionally do NOT install a default mock
// here so that tests are explicit about the network calls they expect.

import { afterEach } from "bun:test";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});
