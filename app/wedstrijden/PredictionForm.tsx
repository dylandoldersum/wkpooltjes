"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { savePrediction } from "./actions";

type Props = {
  matchId: number;
  locked: boolean;
  initialHome: number | null;
  initialAway: number | null;
};

export function PredictionForm({ matchId, locked, initialHome, initialAway }: Props) {
  const router = useRouter();
  const [home, setHome] = useState<string>(initialHome?.toString() ?? "");
  const [away, setAway] = useState<string>(initialAway?.toString() ?? "");
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();
  // Debounce voor router.refresh — anders triggert standings-sidebar bij elke save
  const refreshTimeout = useRef<NodeJS.Timeout | null>(null);

  function save(nextHome: string, nextAway: string) {
    if (nextHome === "" || nextAway === "") return;
    const h = Number(nextHome);
    const a = Number(nextAway);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 20 || a > 20) return;
    setSaved("saving");
    startTransition(async () => {
      const res = await savePrediction({ matchId, homeGoals: h, awayGoals: a });
      setSaved(res.ok ? "saved" : "error");
      if (res.ok) {
        // Debounced refresh — als je 5 wedstrijden snel achter elkaar invult,
        // gebeurt maar 1 server-refresh ~1.5s na de laatste save
        if (refreshTimeout.current) clearTimeout(refreshTimeout.current);
        refreshTimeout.current = setTimeout(() => router.refresh(), 1500);
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={20}
        disabled={locked}
        value={home}
        onChange={(e) => {
          setHome(e.target.value);
          save(e.target.value, away);
        }}
        className="w-12 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje disabled:bg-slate-50 disabled:text-slate-400"
      />
      <span className="text-slate-400">-</span>
      <input
        type="number"
        min={0}
        max={20}
        disabled={locked}
        value={away}
        onChange={(e) => {
          setAway(e.target.value);
          save(home, e.target.value);
        }}
        className="w-12 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje disabled:bg-slate-50 disabled:text-slate-400"
      />
      <span className="ml-1 w-4 text-xs">
        {saved === "saving" && "…"}
        {saved === "saved" && <span className="text-green-600">✓</span>}
        {saved === "error" && <span className="text-red-600">!</span>}
      </span>
    </div>
  );
}
