"use client";

import { useState, type FormEvent } from "react";

export function AddressInput({
  initial,
  onSubmit,
  error,
}: {
  initial?: string;
  onSubmit: (address: string) => void;
  error?: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label htmlFor="address" className="sr-only">
        Home address
      </label>
      <div className="flex gap-2">
        <input
          id="address"
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter your home address"
          className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-3 text-lg outline-none focus:border-stone-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-700 px-5 py-3 text-white font-medium hover:bg-amber-800"
        >
          Search
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
