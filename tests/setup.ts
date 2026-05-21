// Global setup for bun test.
// Each test that needs to mock outbound HTTP should override globalThis.fetch
// using setMockFetch() and restore happens automatically in afterEach.

import { afterEach } from "bun:test";

const realFetch = globalThis.fetch;

/** Install a one-shot mock fetch that satisfies the `typeof fetch` shape. */
export function setMockFetch(
  impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
) {
  const f = impl as unknown as typeof fetch;
  // Bun's `typeof fetch` includes a `preconnect` method — stub it.
  (f as unknown as { preconnect: () => void }).preconnect = () => {};
  globalThis.fetch = f;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});
