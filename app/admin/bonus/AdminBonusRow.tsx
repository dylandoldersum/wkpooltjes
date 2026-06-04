"use client";

import { useState, useTransition } from "react";
import { setBonusCorrect, setBonusLocksAt } from "./actions";

type Team = { id: number; name: string; flag: string };

type Props = {
  questionId: number;
  question: string;
  type: "team" | "text" | "number" | "player";
  points: number;
  initialCorrect: string;
  initialLocksAt: string;
  teams: Team[];
};

export function AdminBonusRow({
  questionId,
  question,
  type,
  points,
  initialCorrect,
  initialLocksAt,
  teams,
}: Props) {
  const [correct, setCorrect] = useState(initialCorrect);
  const [locksAt, setLocksAt] = useState(initialLocksAt);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, startTransition] = useTransition();

  function saveCorrect() {
    setStatus("saving");
    startTransition(async () => {
      const res = await setBonusCorrect({ questionId, correctAnswer: correct });
      setStatus(res.ok ? "saved" : "error");
    });
  }

  function saveLocks() {
    setStatus("saving");
    startTransition(async () => {
      const res = await setBonusLocksAt({ questionId, locksAt: new Date(locksAt).toISOString() });
      setStatus(res.ok ? "saved" : "error");
    });
  }

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{question}</div>
          <div className="text-xs text-slate-500">
            {points} pt · type: {type}
          </div>
        </div>
        <div className="text-xs">
          {status === "saving" && "…"}
          {status === "saved" && <span className="text-green-600">✓</span>}
          {status === "error" && <span className="text-red-600">!</span>}
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-slate-500">Juist antwoord</label>
          {type === "team" ? (
            <select
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">— kies —</option>
              {teams.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.flag} {t.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type === "number" ? "number" : "text"}
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          )}
          <button
            onClick={saveCorrect}
            className="mt-2 rounded bg-oranje px-3 py-1 text-xs text-white hover:bg-oranje-600"
          >
            Opslaan + herbereken
          </button>
        </div>
        <div>
          <label className="text-xs text-slate-500">Sluit op</label>
          <input
            type="datetime-local"
            value={locksAt}
            onChange={(e) => setLocksAt(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button
            onClick={saveLocks}
            className="mt-2 rounded bg-slate-200 px-3 py-1 text-xs hover:bg-slate-300"
          >
            Lock-tijd opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
