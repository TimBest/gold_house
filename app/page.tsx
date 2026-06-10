"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddressInput } from "@/components/AddressInput";
import { CommodityPicker } from "@/components/CommodityPicker";
import { IsoViz } from "@/components/IsoViz";
import { FallbackForm } from "@/components/FallbackForm";
import { ShareButton } from "@/components/ShareButton";
import { DemoPresets } from "@/components/DemoPresets";
import { clientFetchers, fetchPrices } from "@/lib/clientFetchers";
import { computeForState, type ComputeResult } from "@/lib/pipeline";
import { parseSearchParams, toQueryString } from "@/lib/urlState";
import type { CommodityId, CommodityPrices, UrlState } from "@/lib/types";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageInner />
    </Suspense>
  );
}

function PageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const state = parseSearchParams(new URLSearchParams(sp.toString()));

  const [result, setResult] = useState<ComputeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const pricesRef = useRef<CommodityPrices | null>(null);

  const updateUrl = useCallback(
    (next: UrlState) => {
      router.replace(`/?${toQueryString(next)}`);
    },
    [router]
  );

  useEffect(() => {
    if (!state.address) {
      setResult(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        if (!pricesRef.current) {
          pricesRef.current = await fetchPrices();
        }
        const r = await computeForState(state, pricesRef.current, clientFetchers);
        if (!cancelled) setResult(r);
      } catch (err) {
        if (!cancelled) {
          setResult({ kind: "error", message: (err as Error).message });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.address, state.commodity, state.sqft, state.value]);

  function handleAddressSubmit(address: string) {
    updateUrl({ address, commodity: state.commodity });
  }

  function handleCommodityChange(id: CommodityId) {
    updateUrl({ ...state, commodity: id });
  }

  function handleManualSubmit({ sqft, value }: { sqft: number; value: number }) {
    updateUrl({ ...state, sqft, value });
  }

  function handlePresetPick(next: UrlState) {
    updateUrl({ ...next, commodity: state.commodity });
  }

  function handleReset() {
    router.replace("/");
    setResult(null);
  }

  const showFallback = result?.kind === "needs-manual";
  const errorMessage =
    result?.kind === "error" ? humanizeError(result.message) : undefined;
  const hasResult = result?.kind === "ok";
  const showLanding = !state.address && !loading;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="text-left"
          aria-label="Home"
        >
          <div className="text-xl font-semibold tracking-tight">
            <span aria-hidden>🏠</span> Gold House
          </div>
        </button>
        {state.address && <ShareButton />}
      </header>

      {showLanding && (
        <div className="mb-6 text-center sm:text-left">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            How tall is your home in <span className="text-amber-700">gold</span>?
          </h1>
          <p className="mt-2 text-stone-600">
            Enter a US home address — we&apos;ll show how high a solid block of
            gold, oil, sugar, or soybeans worth its assessed value would
            stack on its footprint.
          </p>
        </div>
      )}

      <div className="space-y-5">
        <AddressInput
          initial={state.address}
          onSubmit={handleAddressSubmit}
          error={errorMessage ?? null}
        />

        {showLanding && <DemoPresets onPick={handlePresetPick} />}

        <CommodityPicker
          selected={state.commodity}
          onSelect={handleCommodityChange}
        />

        {loading && (
          <div
            className="rounded-2xl border border-stone-200 bg-white px-6 py-12 text-center text-stone-500"
            role="status"
          >
            <div className="inline-flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-700"
                aria-hidden
              />
              Crunching numbers…
            </div>
          </div>
        )}

        {!loading && showFallback && (
          <FallbackForm onSubmit={handleManualSubmit} />
        )}

        {!loading && hasResult && pricesRef.current && (
          <IsoViz result={result} prices={pricesRef.current} />
        )}
      </div>

      <footer className="mt-12 text-center text-xs text-stone-400">
        Free data: Nominatim · OpenStreetMap. Commodity prices use the
        bundled fallback snapshot.
      </footer>
    </main>
  );
}

function humanizeError(raw: string): string {
  if (/non[_ -]?us/i.test(raw) || /US addresses only/i.test(raw)) {
    return "US addresses only for now.";
  }
  if (/find that address|no result|not found/i.test(raw)) {
    return "We couldn't find that address. Try including city and state.";
  }
  if (/502|network|nominatim/i.test(raw)) {
    return "Geocoding is temporarily unavailable. Try a sample below or enter sqft + value manually.";
  }
  return raw;
}
