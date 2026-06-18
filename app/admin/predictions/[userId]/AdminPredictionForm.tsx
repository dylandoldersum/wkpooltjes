"use client";

import { useState, useTransition } from "react";
import { adminSavePrediction } from "./actions";

type Props = {
  userId: number;
  matchId: number;
  initialHome: number | null;
  initialAway: number | null;
};

export function AdminPredictionForm({ userId, matchId, initialHome, initialAway }: Props) {
  const [home, setHome] = useState<string>(initialHome?.toString() ?? "");
  const [away, setAway] = useState<string>(initialAway?.toString() ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();

  function save(nextHome: string, nextAway: string) {
    const hEmpty = nextHome.trim() === "";
    const aEmpty = nextAway.trim() === "";
    if (hEmpty !== aEmpty) return; // wacht tot beide ingevuld of beide leeg

    const h = hEmpty ? null : Number(nextHome);
    const a = aEmpty ? null : Number(nextAway);
    if (h !== null && (!Number.isInteger(h) || h < 0 || h > 20)) return;
    if (a !== null && (!Number.isInteger(a) || a < 0 || a > 20)) return;

    setStatus("saving");
    startTransition(async () => {
      const res = await adminSavePrediction({
        userId,
        matchId,
        homeGoals: h,
        awayGoals: a,
      });
      setStatus(res.ok ? "saved" : "error");
    });
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min={0}
        max={20}
        value={home}
        onChange={(e) => {
          setHome(e.target.value);
          save(e.target.value, away);
        }}
        className="w-12 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje"
      />
      <span className="text-slate-400">-</span>
      <input
        type="number"
        min={0}
        max={20}
        value={away}
        onChange={(e) => {
          setAway(e.target.value);
          save(home, e.target.value);
        }}
        className="w-12 rounded border border-slate-300 px-2 py-1 text-center text-sm focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje"
      />
      <span className="ml-1 w-4 text-xs">
        {status === "saving" && "…"}
        {status === "saved" && <span className="text-green-600">✓</span>}
        {status === "error" && <span className="text-red-600">!</span>}
      </span>
    </div>
  );
}
