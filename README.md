# Gold House — Home Value Commodity Visualizer

A single-page web app: enter a US home address, see how tall a solid block of
gold, oil, or sugar worth your home's assessed value would be.

**Status:** MVP — data flow first; visualization is currently a numbers-only
placeholder. The full isometric canvas is deferred.

## Stack

- Next.js 15 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- Bun (package manager + test runner)

## Getting started

```sh
bun install
bun run dev          # http://localhost:3000
```

## Tests

The project is built test-first. Pure-function library modules
(`lib/math.ts`, `lib/commodities.ts`, `lib/scaleReference.ts`,
`lib/urlState.ts`) have direct unit tests. The network-facing modules
(`lib/geocode.ts`, `lib/footprint.ts`, `lib/assessor.ts`) are tested with
mocked `fetch`. `tests/flow.test.ts` exercises the full pipeline end-to-end.

```sh
bun test             # one-shot
bun test --watch     # watch mode
bun run typecheck    # tsc --noEmit
```

## Architecture

```
app/
  page.tsx                 Client component; reads ?address=&commodity=&sqft=&value=
  api/
    commodities/route.ts   GET — server-side price fetch + fallback
    geocode/route.ts       GET ?address= — Nominatim
    footprint/route.ts     GET ?lat=&lng= — Overpass
    assessor/route.ts      GET ?address=&lat=&lng= — county API / ATTOM chain

lib/
  math.ts            Pure math: sqFt↔m², polygon area, prism height
  commodities.ts     COMMODITIES table + pricePerM3 + FALLBACK_PRICES
  scaleReference.ts  Reference-object ladder + pickReference()
  urlState.ts        Parse/serialize ?address&commodity&sqft&value
  geocode.ts         Nominatim client (US-only)
  footprint.ts       Overpass client (returns null when no building near point)
  assessor.ts        Provider chain: county → ATTOM → null
  livePrices.ts      Server-side live-price fetcher (TODO: real APIs)
  pipeline.ts        computeForState — the orchestrator
  clientFetchers.ts  Client-side wrappers around the /api/* routes
```

## What's stubbed

External APIs that need keys are stubbed and return `null` so the manual
fallback form is shown. To wire them up:

- **ATTOM Data:** implement `attomLookup` in `lib/assessor.ts` using
  `process.env.ATTOM_API_KEY`.
- **Live commodity prices:** implement metals-api / EIA / sugar fetches in
  `lib/livePrices.ts`. Until then, `FALLBACK_PRICES` is served (marked with
  `fromFallback: true` and an `asOf` date in the response).

## URL schema

```
/?address=350+5th+Ave+New+York+NY&commodity=gold
/?address=...&commodity=oil&sqft=1800&value=420000   # manual fallback
```

Loading a URL with `sqft` and `value` skips all network calls and goes
straight to the result view.

## Deferred (post-MVP)

- Full isometric canvas / SVG rendering with camera modes
- Reference-object SVG illustrations under `/public/references`
- Smooth CSS transitions between commodities
- County-API lookup table population
- Live ATTOM, metals-api, sugar feed integration
- CI / deployment config
