import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/db/client";
import { sql } from "drizzle-orm";

export default async function AdminBackup() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  // Quick stats
  const [{ users }] = await db.select({ users: sql<number>`count(*)` }).from(schema.users);
  const [{ predictions }] = await db
    .select({ predictions: sql<number>`count(*)` })
    .from(schema.predictions);
  const [{ bonus }] = await db
    .select({ bonus: sql<number>`count(*)` })
    .from(schema.bonusAnswers);
  const [{ bracket }] = await db
    .select({ bracket: sql<number>`count(*)` })
    .from(schema.bracketPredictions);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admin · Backup</h1>
        <p className="text-sm text-slate-600">
          Download alle data van de pool als JSON-bestand. Inclusief gebruikers (zonder
          wachtwoorden), voorspellingen, bonusantwoorden, bracket-keuzes en instellingen.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-oranje-600">{Number(users)}</div>
          <div className="text-xs text-slate-500">gebruikers</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-oranje-600">{Number(predictions)}</div>
          <div className="text-xs text-slate-500">wedstrijdvoorspellingen</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-oranje-600">{Number(bonus)}</div>
          <div className="text-xs text-slate-500">bonusantwoorden</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <div className="text-2xl font-bold text-oranje-600">{Number(bracket)}</div>
          <div className="text-xs text-slate-500">bracket-picks</div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Volledige backup</h2>
        <p className="mt-1 text-sm text-slate-600">
          Eén JSON-bestand met alle tabellen. Wachtwoord-hashes worden niet meegenomen.
          Verstandig om dit periodiek te downloaden tijdens het WK — vooral voor en na
          belangrijke momenten (lock, einde poulefase, finale).
        </p>
        <a
          href="/api/admin/backup"
          download
          className="mt-3 inline-block rounded-lg bg-oranje px-4 py-2 text-sm font-medium text-white hover:bg-oranje-600"
        >
          ⬇ Download backup (JSON)
        </a>
      </div>

      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
        <strong>Tip:</strong> Turso houdt zelf ook automatische backups bij. Via{" "}
        <a
          href="https://app.turso.tech"
          target="_blank"
          rel="noopener noreferrer"
          className="text-oranje-600 hover:underline"
        >
          app.turso.tech
        </a>{" "}
        → je database → <em>Backups</em> kun je terug naar elk punt in de afgelopen
        24u (gratis tier). Deze JSON-export is voor handmatige snapshots en eenmalige
        analyses.
      </div>
    </div>
  );
}
