"use client";

import { useState, type FormEvent } from "react";
import { isPositiveFinite } from "@/lib/math";

export function FallbackForm({
  onSubmit,
}: {
  onSubmit: (input: { sqft: number; value: number }) => void;
}) {
  const [sqft, setSqft] = useState("");
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const s = Number(sqft);
    const v = Number(value);
    if (!isPositiveFinite(s) || !isPositiveFinite(v)) return;
    onSubmit({ sqft: s, value: v });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-stone-200 bg-white p-6"
    >
      <p className="mb-4 text-sm text-stone-600">
        We couldn&apos;t fetch your home&apos;s details automatically. Enter
        them manually:
      </p>
      <div className="space-y-3">
        <div>
          <label htmlFor="sqft" className="block text-sm font-medium">
            Square footage
          </label>
          <input
            id="sqft"
            type="number"
            inputMode="numeric"
            value={sqft}
            onChange={(e) => setSqft(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            placeholder="1800"
          />
        </div>
        <div>
          <label htmlFor="value" className="block text-sm font-medium">
            Home value (USD)
          </label>
          <input
            id="value"
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            placeholder="420000"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-amber-700 py-2 font-medium text-white hover:bg-amber-800"
        >
          Visualize
        </button>
      </div>
    </form>
  );
}
