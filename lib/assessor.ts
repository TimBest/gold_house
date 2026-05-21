import type { AssessorQuery, AssessorResult } from "./types";
export type { AssessorQuery } from "./types";

type Provider = (q: AssessorQuery) => Promise<AssessorResult | null>;

// County-API lookup table — currently empty. To extend, map FIPS or
// county-name detection from `q.address` to a fetcher.
// TODO: populate with the top-20 counties by population.
const countyApiLookup: Provider = async (_q) => {
  return null;
};

// ATTOM Data free-tier wrapper. Requires ATTOM_API_KEY env var (not set yet).
// TODO: implement against https://api.developer.attomdata.com when a key is
// available. Currently returns null so the manual-fallback form is shown.
const attomLookup: Provider = async (_q) => {
  if (!process.env.ATTOM_API_KEY) return null;
  // Real implementation would call ATTOM here.
  return null;
};

let providers = {
  county: countyApiLookup,
  attom: attomLookup,
};

/** Test-only: replace the provider chain. */
export function __setProviders(p: { county: Provider; attom: Provider }) {
  providers = p;
}

/** Test-only: restore the default provider chain. */
export function __resetProviders() {
  providers = { county: countyApiLookup, attom: attomLookup };
}

async function tryProvider(
  p: Provider,
  q: AssessorQuery
): Promise<AssessorResult | null> {
  try {
    return await p(q);
  } catch {
    // Swallow provider errors so the next link in the chain can run.
    // Real implementation should log to an observability sink.
    return null;
  }
}

/**
 * Look up the home's assessed value via the configured provider chain:
 *   county API → ATTOM → null (caller shows manual fallback form).
 */
export async function fetchAssessorData(
  q: AssessorQuery
): Promise<AssessorResult | null> {
  const fromCounty = await tryProvider(providers.county, q);
  if (fromCounty !== null) return fromCounty;
  const fromAttom = await tryProvider(providers.attom, q);
  if (fromAttom !== null) return fromAttom;
  return null;
}
