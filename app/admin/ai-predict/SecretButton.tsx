"use client";

import { useState, useTransition } from "react";
import { runAiPredictForMe } from "./actions";

type Result = Awaited<ReturnType<typeof runAiPredictForMe>>;

export function SecretButton() {
  const [state, setState] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setState(null);
    startTransition(async () => {
      const res = await runAiPredictForMe();
      setState(res);
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={run}
        disabled={pending}
        className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:opacity-50"
        title="Auto-fill"
      >
        {pending ? "Bezig…" : "⚙︎"}
      </button>
      {state && state.ok && (
        <div className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
          ✓ {state.result.matches.predicted} wedstrijden · {state.result.bonus.predicted} bonus ·{" "}
          {state.result.bracket.predicted} bracket
        </div>
      )}
      {state && !state.ok && (
        <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{state.error}</div>
      )}
    </div>
  );
}
