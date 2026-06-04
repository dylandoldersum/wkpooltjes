"use client";

import { useState, useTransition } from "react";
import { setBracketActual } from "./actions";

type Team = { id: number; name: string; flag: string };

type Props = {
  slotId: number;
  label: string;
  initialTeamId: number | null;
  teams: Team[];
};

export function AdminBracketRow({ slotId, label, initialTeamId, teams }: Props) {
  const [value, setValue] = useState(initialTeamId ? String(initialTeamId) : "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();

  function save(next: string) {
    setValue(next);
    setStatus("saving");
    startTransition(async () => {
      const res = await setBracketActual({
        slotId,
        teamId: next ? Number(next) : null,
      });
      setStatus(res.ok ? "saved" : "error");
    });
  }

  return (
    <div className="rounded-lg border border-slate-100 p-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-600">
        <span>{label}</span>
        {status === "saving" && <span className="text-slate-400">…</span>}
        {status === "saved" && <span className="text-green-600">✓</span>}
        {status === "error" && <span className="text-red-600">!</span>}
      </div>
      <select
        value={value}
        onChange={(e) => save(e.target.value)}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
      >
        <option value="">— leeg —</option>
        {teams.map((t) => (
          <option key={t.id} value={String(t.id)}>
            {t.flag} {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
