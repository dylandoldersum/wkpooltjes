"use client";

import { useState, useTransition } from "react";
import { saveBonusAnswer } from "./actions";

type Team = { id: number; name: string; flag: string };
type Props = {
  questionId: number;
  type: "team" | "text" | "number" | "player";
  locked: boolean;
  initial: string;
  teams: Team[];
};

export function BonusForm({ questionId, type, locked, initial, teams }: Props) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();

  function commit(next: string) {
    setValue(next);
    if (next === initial) return;
    if (!next.trim()) return;
    setState("saving");
    startTransition(async () => {
      const res = await saveBonusAnswer({ questionId, answer: next });
      setState(res.ok ? "saved" : "error");
    });
  }

  if (type === "team") {
    return (
      <div className="flex items-center gap-2">
        <select
          disabled={locked}
          value={value}
          onChange={(e) => commit(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje disabled:bg-slate-50"
        >
          <option value="">— kies een land —</option>
          {teams.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.flag} {t.name}
            </option>
          ))}
        </select>
        <StatusIcon state={state} />
      </div>
    );
  }

  if (type === "number") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={999}
          disabled={locked}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          className="w-24 rounded border border-slate-300 px-3 py-2 text-sm focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje disabled:bg-slate-50"
        />
        <StatusIcon state={state} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        disabled={locked}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm focus:border-oranje focus:outline-none focus:ring-1 focus:ring-oranje disabled:bg-slate-50"
      />
      <StatusIcon state={state} />
    </div>
  );
}

function StatusIcon({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "saving") return <span className="text-xs text-slate-400">…</span>;
  if (state === "saved") return <span className="text-xs text-green-600">✓</span>;
  if (state === "error") return <span className="text-xs text-red-600">!</span>;
  return null;
}
