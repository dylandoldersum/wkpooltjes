"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyBracketSuggestions } from "./actions";

export function SuggestionButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  function run() {
    setMessage(null);
    startTransition(async () => {
      const res = await applyBracketSuggestions();
      if (res.ok) {
        setMessage({
          kind: "ok",
          text: `✓ ${res.groupsApplied} poules + ${res.bestThirdsApplied} beste 3e ingevuld op basis van je wedstrijdvoorspellingen. Je kunt nog overschrijven via de dropdowns.`,
        });
        router.refresh();
      } else {
        setMessage({ kind: "error", text: res.error ?? "Onbekende fout" });
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        onClick={run}
        disabled={pending}
        className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50"
      >
        {pending ? "Bezig met berekenen…" : "🧮 Vul in op basis van mijn wedstrijdvoorspellingen"}
      </button>
      {message && (
        <div
          className={`rounded px-3 py-2 text-xs ${
            message.kind === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
