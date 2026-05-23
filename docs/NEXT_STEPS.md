# Gold House MVP — Status & Next Steps

_Snapshot taken 2026-05-21. PR #12 (`claude/commodity-visualizer-display-netlify` → `master`) is the working branch._

---

## Where we are

### What's shipping in PR #12

- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4 + Bun.
- 78 tests passing (`bun test`); `bun run typecheck` and `bun run build` clean.
- Netlify deploy config (`netlify.toml` + explicit `@netlify/plugin-nextjs`).
- One client page (`app/page.tsx`) with hero, four demo-preset chips, commodity
  picker, address input, manual-fallback form, share button, error humanizer.
- Proportional 2D visualization (commodity column + stacked reference glyphs
  on the same px/m scale, capped at 20 stacked DOM nodes).
- Four server-side API routes wrapping the lib fetchers with sensible cache
  headers and status codes.

### Modules complete (all under `lib/`)

| File | Purpose | State |
|---|---|---|
| `math.ts` | sqFtToSqM, polygonAreaM2, totalFloorAreaM2, heightOfPrism, isPositiveFinite | ✅ |
| `commodities.ts` | COMMODITIES table, pricePerM3 conversions, FALLBACK_PRICES | ✅ |
| `scaleReference.ts` | REFERENCE_OBJECTS ladder + pickReference + glyphs | ✅ (glyphs are emoji stand-ins, not SVG) |
| `urlState.ts` | URL param round-trip | ✅ |
| `geocode.ts` | Nominatim client, US-only guard | ✅ |
| `footprint.ts` | Overpass client | ✅ |
| `assessor.ts` | Pluggable county → ATTOM → null chain | ⚠️ Both providers stubbed |
| `livePrices.ts` | Server-side commodity-price fetcher | ⚠️ Returns FALLBACK_PRICES |
| `pipeline.ts` | computeForState orchestrator | ✅ |
| `clientFetchers.ts` | Typed wrappers around /api/* | ✅ |
| `demoPresets.ts` | Four offline sample homes | ✅ |
| `formatting.ts` | formatMeters, formatBigUSD | ✅ |

### Known limitations vs the spec

1. **Visualization is 2D, not isometric.** Spec sections 7–8 (camera modes,
   SVG reference illustrations, smooth transitions) are deferred.
2. **No live commodity prices.** `lib/livePrices.ts` returns the bundled
   `FALLBACK_PRICES` snapshot. The disclaimer label the spec calls for
   (`"using cached price as of [date]"`) is not rendered.
3. **No real assessor data.** Both `countyApiLookup` and `attomLookup` in
   `lib/assessor.ts` return `null` so the manual-fallback form is shown
   whenever the user enters an address.
4. **No address-input debounce.** Spec section 14 calls for 500 ms because of
   Nominatim's 1 req/sec policy. We only call on submit so it isn't
   load-bearing today, but type-ahead would need it.

---

## Plan to finish the MVP

### P0 — Confirm the Netlify deploy works

The last user-visible blocker was a 404 from Netlify; the `@netlify/plugin-nextjs`
fix was pushed but unverified at the time of writing.

- [ ] Open the PR #12 deploy preview URL
- [ ] Hit `/` — landing page renders with hero + presets
- [ ] Click each of the four sample-home chips and confirm the viz renders
- [ ] Try a real US address (e.g. `350 5th Ave, New York, NY`) — confirm the
      pipeline either renders the result or falls back gracefully (depending on
      whether Netlify's outbound can reach Nominatim/Overpass)
- [ ] Toggle commodities and confirm the column re-scales

### P1 — Live commodity prices (highest impact, lowest cost)

The data layer is already wired for this; `lib/livePrices.ts` is the single
file to change. Each source has a clean fallback to the snapshot in
`FALLBACK_PRICES`, so a single outage doesn't break the page.

- [ ] **Oil — EIA API** (no key required). Endpoint:
      `https://api.eia.gov/v2/petroleum/pri/spt/data?...&api_key=NONE` — actually
      EIA *does* require a free key now; register at https://www.eia.gov/opendata.
      Wire `EIA_API_KEY` into `livePrices.ts`.
- [ ] **Gold — metals-api.com** free tier (`METALS_API_KEY`). USD/troy oz spot.
- [ ] **Sugar — research a feed.** Candidates: Alpha Vantage commodity endpoint
      (`COMMODITY=SUGAR`), Trading Economics free tier, or scrape ICE delayed.
      If none free-no-strings, keep the snapshot and document the env var name.
- [ ] **UI disclaimer** — when any `CommodityPriceSnapshot.fromFallback === true`,
      render a small caption in `IsoViz` ("Using cached price as of 2025-01-15").
      The data field already exists; just wire the render.
- [ ] **Server-side caching** — wrap `fetchLivePrices` with a 5-minute in-memory
      cache so we don't re-hit the free tiers on every API route call.

### P2 — Real assessor data

This is the spec's third data pillar and the most regulatory-fragmented part.

- [ ] **ATTOM Data free tier** (`ATTOM_API_KEY`). The wrapper in
      `lib/assessor.ts` already gates on the env var. Implement
      `attomLookup` against `https://api.developer.attomdata.com/...`.
- [ ] **County API lookup table.** Start with the top four most-populated US
      counties: Los Angeles (LA County Assessor portal), Cook (Illinois),
      Harris (Texas), Maricopa (Arizona). Each has its own quirks; map
      address→county via the geocode result's `display_name` parsing.
- [ ] **Server-side cache** — per-address, 24 h. Vercel KV or a simple
      in-memory Map for now.

### P3 — Real isometric visualization

The user-facing differentiator. Spec sections 7 and 8.

- [ ] **SVG reference illustrations** — create the six SVGs called for in
      `lib/scaleReference.ts` (`credit-card.svg`, `human.svg`,
      `telephone-pole.svg`, `statue-of-liberty.svg`, `eiffel-tower.svg`,
      `burj-khalifa.svg`) and drop them in `/public/references`. Single-color
      flat outlines per the spec.
- [ ] **Isometric prism math** — extrude the building polygon upward by
      `heightM`. Project to 2D via the standard isometric matrix
      (`x = (X - Y) * cos(30°)`, `y = (X + Y) * sin(30°) - Z`).
- [ ] **Canvas vs SVG decision** — Canvas is faster for large extrusions;
      SVG is easier to make responsive and a11y-friendly. Recommend SVG for
      MVP, swap to Canvas only if perf becomes an issue.
- [ ] **Camera modes** (spec section 8):
      `< 2 m` head-on, `2–50 m` 15–20° tilt, `50–500 m` full iso 30°,
      `> 500 m` wide iso with reference object as a small marker.
- [ ] **Smooth transitions** — 600 ms ease-in-out CSS transition on the
      transform when commodity changes.

### P4 — Polish & quality

- [ ] **Component tests** — add `@testing-library/react` + Bun preset, write
      tests for `AddressInput`, `CommodityPicker`, `FallbackForm`.
- [ ] **API route tests** — direct tests for the four `/api/*` handlers
      that don't rely on the live pipeline. Mock `lib/*` via `mock.module`.
- [ ] **Address debounce** — 500 ms in `AddressInput` if we ever do type-ahead.
- [ ] **A11y audit** — `aria-pressed` on commodity buttons, focus rings,
      keyboard nav through presets, color contrast ratios for the picker.
- [ ] **App-level error boundary** — `app/global-error.tsx`.
- [ ] **CI** — GitHub Actions workflow: `bun install && bun test && bun run
      build` on PR. Also add a `bun run lint` step.
- [ ] **Mobile testing** — actual phone viewport, not just devtools.

### P5 — Nice-to-haves (post-MVP)

- [ ] Bundle-size budget; investigate dropping any unused Tailwind variants.
- [ ] Lighthouse performance budget.
- [ ] OG image for shareable URLs.
- [ ] Light/dark mode toggle.
- [ ] Saved-address history (would require accounts → out of MVP scope).

---

## Open questions for the user

1. **API keys** — do you want me to register for ATTOM and metals-api free
   tiers myself, or will you provide keys? They're per-account.
2. **Visualization scope** — finish the isometric (~1–2 day effort) before
   shipping, or call the current 2D-proportional version "done enough" and
   move to data sources?
3. **County API table** — worth the implementation effort for top-4
   counties, or rely on ATTOM exclusively until coverage gaps appear?
4. **CI** — want the GitHub Actions workflow added now?
5. **Sugar price source** — happy with a permanently-cached snapshot
   (clearly labelled), or should we add a paid feed?

---

## Recommended next-session focus

If I were picking one thing to push next: **P1 (live prices) + the cached-price
disclaimer**. It's the lowest-effort highest-impact item, completes the
"Data Fetching" pillar of the spec, and exercises the fallback-disclaimer
plumbing that's already wired but unused. Then **P3 (isometric viz)** as the
visible product-quality lever.

P0 (deploy verification) is a prerequisite for everything visible.
