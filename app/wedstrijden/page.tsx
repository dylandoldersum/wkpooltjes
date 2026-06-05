import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatDateLong, formatTime, dateKey } from "@/lib/format";
import { totoLabel } from "@/lib/scoring";
import { PredictionForm } from "./PredictionForm";

export default async function WedstrijdenPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allMatches = await db
    .select()
    .from(schema.matches)
    .orderBy(asc(schema.matches.kickoff));

  // Filter wedstrijden zonder team-info (knockout-matches waar nog niet duidelijk
  // is wie er speelt — kun je geen score op voorspellen)
  const matchesRaw = allMatches.filter(
    (m) =>
      (m.homeTeamId !== null || m.homeLabel) &&
      (m.awayTeamId !== null || m.awayLabel),
  );
  const hiddenTbdCount = allMatches.length - matchesRaw.length;

  const teamMap = new Map(
    (await db.select().from(schema.teams)).map((t) => [t.id, t]),
  );

  const userPredictions = await db
    .select()
    .from(schema.predictions)
    .where(eq(schema.predictions.userId, user.id));
  const predMap = new Map(userPredictions.map((p) => [p.matchId, p]));

  const now = new Date();

  // Group by date (Amsterdam tz)
  const byDate = new Map<string, typeof matchesRaw>();
  for (const m of matchesRaw) {
    const key = dateKey(m.kickoff);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(m);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wedstrijden</h1>
        <p className="text-sm text-slate-600">
          Voorspel de eindstand. Punten: <strong>5</strong> voor exacte score,{" "}
          <strong>2</strong> voor juiste toto (1-X-2). Wedstrijden sluiten bij aftrap.
        </p>
        {hiddenTbdCount > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            ℹ️ {hiddenTbdCount} knockout-wedstrijd{hiddenTbdCount === 1 ? "" : "en"} verborgen —
            teams nog niet bekend. Verschijnen zodra de poulefase voorbij is.
          </p>
        )}
      </div>

      {[...byDate.entries()].map(([key, dayMatches]) => {
        const sample = dayMatches[0];
        return (
          <section key={key} className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold capitalize text-slate-700">
              {formatDateLong(sample.kickoff)}
            </h2>
            <div className="space-y-2">
              {dayMatches.map((m) => {
                const home = m.homeTeamId ? teamMap.get(m.homeTeamId) : null;
                const away = m.awayTeamId ? teamMap.get(m.awayTeamId) : null;
                const locked = m.kickoff.getTime() <= now.getTime();
                const prediction = predMap.get(m.id);
                return (
                  <div
                    key={m.id}
                    className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <div className="col-span-2 text-sm text-slate-500">
                      {formatTime(m.kickoff)}
                      {m.groupCode && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                          Poule {m.groupCode}
                        </span>
                      )}
                    </div>
                    <div className="col-span-10 sm:col-span-7">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex-1 text-right text-sm font-medium">
                          <span className="mr-2">{home?.flag}</span>
                          {home?.name ?? m.homeLabel}
                        </span>
                        <PredictionForm
                          matchId={m.id}
                          locked={locked || !home || !away}
                          initialHome={prediction?.homeGoals ?? null}
                          initialAway={prediction?.awayGoals ?? null}
                        />
                        <span className="flex-1 text-sm font-medium">
                          {away?.name ?? m.awayLabel}
                          <span className="ml-2">{away?.flag}</span>
                        </span>
                      </div>
                      {m.finished && m.homeGoals !== null && m.awayGoals !== null && (
                        <div className="mt-1 text-center text-xs text-slate-500">
                          Uitslag: {m.homeGoals}-{m.awayGoals} ({totoLabel(m.homeGoals, m.awayGoals)})
                          {prediction && (
                            <span className="ml-2 rounded bg-oranje-50 px-1.5 py-0.5 font-medium text-oranje-700">
                              {prediction.pointsAwarded} pt
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-12 sm:col-span-3 text-right text-xs text-slate-400">
                      {locked ? "🔒 gesloten" : prediction ? "✓ ingevuld" : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
