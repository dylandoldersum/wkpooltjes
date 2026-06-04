"use client";

import { useState, useTransition } from "react";
import { savePrizes } from "./actions";

export function PrizesForm({ initial }: { initial: string }) {
  const [text, setText] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();

  function save() {
    setStatus("saving");
    startTransition(async () => {
      const res = await savePrizes({ text });
      setStatus(res.ok ? "saved" : "error");
    });
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje"
        placeholder="🥇 1e plaats — €50&#10;🥈 2e plaats — €25&#10;🥉 3e plaats — €10"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-lg bg-oranje px-4 py-2 text-sm font-medium text-white hover:bg-oranje-600"
        >
          {status === "saving" ? "Opslaan…" : "Opslaan"}
        </button>
        {status === "saved" && <span className="text-sm text-green-600">✓ Opgeslagen</span>}
        {status === "error" && <span className="text-sm text-red-600">Er ging iets mis</span>}
      </div>
    </div>
  );
}
