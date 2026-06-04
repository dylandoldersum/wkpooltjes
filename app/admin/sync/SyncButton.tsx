"use client";

import { useState, useTransition } from "react";
import { runManualSync } from "./actions";
import type { SyncResult } from "@/lib/sync";

export function SyncButton() {
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await runManualSync();
      if (res.ok) setResult(res.result);
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={run}
        disabled={pending}
        className="rounded-lg bg-oranje px-4 py-2 text-sm font-medium text-white hover:bg-oranje-600 disabled:opacity-50"
      >
        {pending ? "Bezig met synchroniseren…" : "Sync nu (football-data.org)"}
      </button>
      {error && (
        <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      {result && (
        <div className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">
          <div>
            <strong>{result.updated}</strong> wedstrijd(en) bijgewerkt. {result.alreadyUpToDate}{" "}
            al up-to-date. {result.unmatched} niet gekoppeld.
          </div>
          <div className="text-xs">
            ({result.finishedFromApi} afgeronde wedstrijden in API van {result.totalFromApi} totaal)
          </div>
          {result.unmatched > 0 && (
            <div className="mt-1 text-xs text-amber-700">
              Niet gekoppeld:{" "}
              {result.unmatchedSamples.map((s, i) => (
                <span key={i}>
                  {s.home}-{s.away}
                  {i < result.unmatchedSamples.length - 1 ? ", " : ""}
                </span>
              ))}
              {result.unmatched > result.unmatchedSamples.length && " …"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
