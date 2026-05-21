"use client";

import { useState } from "react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — silently no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:border-stone-400"
    >
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
