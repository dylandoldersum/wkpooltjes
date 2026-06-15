"use client";

import { useState, useTransition } from "react";
import { saveBracketLock, saveBonusBulkLock } from "./actions";

type BonusQ = { id: number; question: string; locksAt: string };

type Props = {
  initialBracketLockAt: string;
  initialForceLocked: boolean;
  currentlyLocked: boolean;
  bonusQuestions: BonusQ[];
};

// Helper: ISO string → datetime-local input format ("YYYY-MM-DDTHH:mm" in lokale tijd)
function isoToLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InstellingenForm({
  initialBracketLockAt,
  initialForceLocked,
  currentlyLocked,
  bonusQuestions,
}: Props) {
  const [bracketLockAt, setBracketLockAt] = useState(isoToLocal(initialBracketLockAt));
  const [forceLocked, setForceLocked] = useState(initialForceLocked);
  const [bracketStatus, setBracketStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [bracketError, setBracketError] = useState<string | null>(null);
  const [, startBracketTransition] = useTransition();

  function saveBracket() {
    setBracketStatus("saving");
    setBracketError(null);
    startBracketTransition(async () => {
      const res = await saveBracketLock({
        lockAt: new Date(bracketLockAt).toISOString(),
        forceLocked,
      });
      if (res.ok) setBracketStatus("saved");
      else {
        setBracketStatus("error");
        setBracketError(res.error ?? "Onbekende fout");
      }
    });
  }

  // Bonus bulk
  const [bonusBulkDate, setBonusBulkDate] = useState(
    bonusQuestions.length > 0 ? isoToLocal(bonusQuestions[0].locksAt) : "",
  );
  const [bonusBulkStatus, setBonusBulkStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [bonusBulkError, setBonusBulkError] = useState<string | null>(null);
  const [, startBonusTransition] = useTransition();

  function saveBonusBulk() {
    if (!bonusBulkDate) return;
    setBonusBulkStatus("saving");
    setBonusBulkError(null);
    startBonusTransition(async () => {
      const res = await saveBonusBulkLock({
        locksAt: new Date(bonusBulkDate).toISOString(),
      });
      if (res.ok) setBonusBulkStatus("saved");
      else {
        setBonusBulkStatus("error");
        setBonusBulkError(res.error ?? "Onbekende fout");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ============ Bracket lock ============ */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bracket sluitingsdatum</h2>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              currentlyLocked
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {currentlyLocked ? "🔒 Gesloten" : "🔓 Open"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Wanneer wordt de bracket gesloten zodat deelnemers geen wijzigingen meer kunnen
          maken? Default: 28 juni 17:00 (na poulefase, voor R32).
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Sluit op (NL-tijd)</label>
            <input
              type="datetime-local"
              value={bracketLockAt}
              onChange={(e) => setBracketLockAt(e.target.value)}
              className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
            <input
              type="checkbox"
              id="forceLocked"
              checked={forceLocked}
              onChange={(e) => setForceLocked(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <label htmlFor="forceLocked" className="flex-1 text-sm">
              <span className="font-medium">Direct sluiten (force-lock)</span>
              <div className="text-xs text-slate-600">
                Negeert de datum hierboven en sluit de bracket nu. Vink uit om weer open te zetten.
              </div>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveBracket}
              className="rounded-lg bg-oranje px-4 py-2 text-sm font-medium text-white hover:bg-oranje-600"
            >
              {bracketStatus === "saving" ? "Opslaan…" : "Bracket-instellingen opslaan"}
            </button>
            {bracketStatus === "saved" && (
              <span className="text-sm text-green-600">✓ Opgeslagen</span>
            )}
            {bracketStatus === "error" && (
              <span className="text-sm text-red-600">! {bracketError}</span>
            )}
          </div>
        </div>
      </section>

      {/* ============ Bonus vragen bulk ============ */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Bonusvragen — bulk update</h2>
        <p className="mt-1 text-sm text-slate-600">
          Zet alle {bonusQuestions.length} bonusvragen op dezelfde sluitingsdatum.
          Voor finetuning per vraag: ga naar{" "}
          <a href="/admin/bonus" className="text-oranje-600 hover:underline">
            Bonusantwoorden
          </a>
          .
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600">
              Sluit alle bonusvragen op (NL-tijd)
            </label>
            <input
              type="datetime-local"
              value={bonusBulkDate}
              onChange={(e) => setBonusBulkDate(e.target.value)}
              className="mt-1 w-full max-w-xs rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveBonusBulk}
              disabled={!bonusBulkDate}
              className="rounded-lg bg-oranje px-4 py-2 text-sm font-medium text-white hover:bg-oranje-600 disabled:opacity-50"
            >
              {bonusBulkStatus === "saving"
                ? "Bezig…"
                : `Update ${bonusQuestions.length} bonusvragen`}
            </button>
            {bonusBulkStatus === "saved" && (
              <span className="text-sm text-green-600">✓ Alle bonusvragen bijgewerkt</span>
            )}
            {bonusBulkStatus === "error" && (
              <span className="text-sm text-red-600">! {bonusBulkError}</span>
            )}
          </div>
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
            Huidige sluitingstijden per vraag
          </summary>
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            {bonusQuestions.map((q) => (
              <div key={q.id} className="flex justify-between gap-3 rounded border border-slate-100 px-2 py-1">
                <span className="flex-1 truncate">{q.question}</span>
                <span className="font-mono text-slate-500">
                  {new Date(q.locksAt).toLocaleString("nl-NL", {
                    timeZone: "Europe/Amsterdam",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}
