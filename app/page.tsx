"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AddressInput } from "@/components/AddressInput";
import { CommodityPicker } from "@/components/CommodityPicker";
import { IsoViz } from "@/components/IsoViz";
import { FallbackForm } from "@/components/FallbackForm";
import { ShareButton } from "@/components/ShareButton";
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
    updateUrl({ ...state, address });
  }

  function handleCommodityChange(id: CommodityId) {
    updateUrl({ ...state, commodity: id });
  }

  function handleManualSubmit({ sqft, value }: { sqft: number; value: number }) {
    updateUrl({ ...state, sqft, value });
  }

  const showFallback = result?.kind === "needs-manual";
  const errorMessage =
    result?.kind === "error" ? result.message : undefined;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Gold House
        </h1>
        {state.address && <ShareButton />}
      </header>

      <div className="space-y-6">
        <AddressInput
          initial={state.address}
          onSubmit={handleAddressSubmit}
          error={errorMessage ?? null}
        />

        <CommodityPicker
          selected={state.commodity}
          onSelect={handleCommodityChange}
        />

        {loading && (
          <div className="text-center text-stone-500" role="status">
            Crunching numbers…
          </div>
        )}

        {!loading && showFallback && (
          <FallbackForm onSubmit={handleManualSubmit} />
        )}

        {!loading && result?.kind === "ok" && <IsoViz result={result} />}
      </div>

      <footer className="mt-12 text-center text-xs text-stone-400">
        Free data — Nominatim · OpenStreetMap · prices may be cached
      </footer>
    </main>
  );
}
