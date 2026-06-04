"use client";

import { useState, useTransition } from "react";
import { saveBracketPick } from "./actions";

type Team = { id: number; name: string; flag: string };

type Props = {
  slotId: number;
  label: string;
  locked: boolean;
  teams: Team[];
  initialTeamId: number | null;
  actualTeamId: number | null;
  pointsAwarded: number;
};

export function BracketForm({
  slotId,
  label,
  locked,
  teams,
  initialTeamId,
  actualTeamId,
  pointsAwarded,
}: Props) {
  const [value, setValue] = useState<string>(initialTeamId ? String(initialTeamId) : "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();

  function commit(next: string) {
    setValue(next);
    if (!next) return;
    const teamId = Number(next);
    if (!Number.isInteger(teamId)) return;
    setState("saving");
    startTransition(async () => {
      const res = await saveBracketPick({ slotId, teamId });
      setState(res.ok ? "saved" : "error");
    });
  }

  const actualTeam = actualTeamId ? teams.find((t) => t.id === actualTeamId) : null;

  return (
    <div className="rounded-lg border border-slate-100 p-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-slate-600">{label}</div>
        {state === "saving" && <span className="text-xs text-slate-400">…</span>}
        {state === "saved" && <span className="text-xs text-green-600">✓</span>}
      </div>
      <select
        disabled={locked}
        value={value}
        onChange={(e) => commit(e.target.value)}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje disabled:bg-slate-50"
      >
        <option value="">—</option>
        {teams.map((t) => (
          <option key={t.id} value={String(t.id)}>
            {t.flag} {t.name}
          </option>
        ))}
      </select>
      {actualTeam && (
        <div className="mt-1 text-xs text-slate-500">
          Echt: {actualTeam.flag} {actualTeam.name}
          {pointsAwarded > 0 && (
            <span className="ml-1 rounded bg-oranje-50 px-1 py-0.5 font-medium text-oranje-700">
              {pointsAwarded} pt
            </span>
          )}
        </div>
      )}
    </div>
  );
}
