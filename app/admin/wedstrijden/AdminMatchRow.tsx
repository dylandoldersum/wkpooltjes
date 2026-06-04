"use client";

import { useState, useTransition } from "react";
import { setMatchResult, setMatchKickoff } from "./actions";

type Props = {
  matchId: number;
  kickoffTime: string;
  kickoffIso: string;
  homeName: string;
  awayName: string;
  initialHome: number | null;
  initialAway: number | null;
  initialFinished: boolean;
};

export function AdminMatchRow({
  matchId,
  kickoffTime,
  kickoffIso,
  homeName,
  awayName,
  initialHome,
  initialAway,
  initialFinished,
}: Props) {
  const [home, setHome] = useState<string>(initialHome?.toString() ?? "");
  const [away, setAway] = useState<string>(initialAway?.toString() ?? "");
  const [finished, setFinished] = useState(initialFinished);
  const [editKickoff, setEditKickoff] = useState(false);
  const [kickoff, setKickoff] = useState(kickoffIso.slice(0, 16));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();

  function save() {
    setStatus("saving");
    startTransition(async () => {
      const res = await setMatchResult({
        matchId,
        homeGoals: home === "" ? null : Number(home),
        awayGoals: away === "" ? null : Number(away),
        finished,
      });
      setStatus(res.ok ? "saved" : "error");
    });
  }

  function saveKickoff() {
    setStatus("saving");
    startTransition(async () => {
      const res = await setMatchKickoff({ matchId, kickoff: new Date(kickoff).toISOString() });
      if (res.ok) {
        setStatus("saved");
        setEditKickoff(false);
      } else {
        setStatus("error");
      }
    });
  }

  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
      <div className="col-span-2 text-sm text-slate-500">
        {editKickoff ? (
          <div className="flex flex-col gap-1">
            <input
              type="datetime-local"
              value={kickoff}
              onChange={(e) => setKickoff(e.target.value)}
              className="rounded border border-slate-300 px-1 py-0.5 text-xs"
            />
            <div className="flex gap-1">
              <button onClick={saveKickoff} className="text-xs text-oranje-600 hover:underline">
                opslaan
              </button>
              <button onClick={() => setEditKickoff(false)} className="text-xs text-slate-400">
                annuleer
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditKickoff(true)} className="text-left hover:text-oranje-600">
            {kickoffTime} ✎
          </button>
        )}
      </div>
      <div className="col-span-4 text-sm text-right font-medium">{homeName}</div>
      <div className="col-span-2 flex items-center justify-center gap-1">
        <input
          type="number"
          min={0}
          max={20}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          className="w-12 rounded border border-slate-300 px-2 py-1 text-center text-sm"
        />
        <span>-</span>
        <input
          type="number"
          min={0}
          max={20}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          className="w-12 rounded border border-slate-300 px-2 py-1 text-center text-sm"
        />
      </div>
      <div className="col-span-3 text-sm font-medium">{awayName}</div>
      <div className="col-span-1 flex items-center justify-end gap-2">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={finished}
            onChange={(e) => setFinished(e.target.checked)}
          />
          gespeeld
        </label>
        <button
          onClick={save}
          className="rounded bg-oranje px-3 py-1 text-xs text-white hover:bg-oranje-600"
        >
          {status === "saving" ? "…" : status === "saved" ? "✓" : status === "error" ? "!" : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
