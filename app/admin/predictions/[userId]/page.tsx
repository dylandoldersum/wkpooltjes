import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db, schema } from "@/db/client";
import { asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatDateLong, formatTime, dateKey } from "@/lib/format";
import { totoLabel } from "@/lib/scoring";
import { AdminPredictionForm } from "./AdminPredictionForm";

export default async function AdminEditPredictions({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const me = await getCurrentUser();
  if (!me || !me.isAdmin) redirect("/");

  const { userId: userIdRaw } = await params;
  const userId = Number(userIdRaw);
  if (!Number.isFinite(userId)) notFound();

  const [target] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!target) notFound();

  const matches = await db
    .select()
    .from(schema.matches)
    .orderBy(asc(schema.matches.kickoff));
  const teams = await db.select().from(schema.teams);
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const userPredictions = await db
    .select()
    .from(schema.predictions)
    .where(eq(schema.predictions.userId, userId));
  const predMap = new Map(userPredictions.map((p) => [p.matchId, p]));

  // Filter matches met team-info
  const visibleMatches = matches.filter(
    (m) =>
      (m.homeTeamId !== null || m.homeLabel) &&
      (m.awayTeamId !== null || m.awayLabel),
  );

  const byDate = new Map<string, typeof visibleMatches>();
  for (const m of visibleMatches) {
    const k = dateKey(m.kickoff);
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(m);
  }

  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-sm text-oranje-600 hover:underline">
          ← Gebruikers
        </Link>
        <span className="text-slate-300">|</span>
        <Link href={`/anderen/${userId}`} className="text-sm text-oranje-600 hover:underline">
          Bekijk profiel
        </Link>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">
          Voorspellingen bewerken — {target.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Als admin omzeil je de lock op kickoff-tijd. Wijzigingen herberekenen automatisch de punten.
        </p>
        <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ <strong>Gebruik dit alleen voor data-correctie.</strong> Aanpassen ná een
          gespeelde wedstrijd geeft die gebruiker een oneerlijk voordeel.
        </div>
      </div>

      {[...byDate.entries()].map(([key, dayMatches]) => {
        const sample = dayMatches[0];
        return (
          <section key={key} className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold capitalize text-slate-700">
              {formatDateLong(sample.kickoff)}
            </h2>
            <div className="space-y-2">
              {dayMatches.map((m) => {
                const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
                const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
                const pred = predMap.get(m.id);
                const matchStarted = m.kickoff.getTime() <= now;
                return (
                  <div
                    key={m.id}
                    className={`rounded-lg border border-slate-100 px-3 py-2 ${matchStarted ? "bg-slate-50" : ""}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-14 text-xs text-slate-500">
                        {formatTime(m.kickoff)}
                      </span>
                      {m.groupCode && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                          P{m.groupCode}
                        </span>
                      )}
                      <span className="ml-auto flex flex-1 items-center gap-2 sm:ml-0">
                        <span className="flex-1 text-right text-sm font-medium">
                          <span className="mr-1">{home?.flag}</span>
                          {home?.name ?? m.homeLabel}
                        </span>
                        <AdminPredictionForm
                          userId={userId}
                          matchId={m.id}
                          initialHome={pred?.homeGoals ?? null}
                          initialAway={pred?.awayGoals ?? null}
                        />
                        <span className="flex-1 text-sm font-medium">
                          {away?.name ?? m.awayLabel}
                          <span className="ml-1">{away?.flag}</span>
                        </span>
                      </span>
                      <span className="w-full text-right text-xs sm:w-auto">
                        {m.finished && m.homeGoals !== null && m.awayGoals !== null ? (
                          <span className="text-slate-500">
                            Echt: {m.homeGoals}-{m.awayGoals} (
                            {totoLabel(m.homeGoals, m.awayGoals)})
                            {pred && (
                              <span className="ml-1 rounded bg-oranje-50 px-1.5 py-0.5 font-medium text-oranje-700">
                                {pred.pointsAwarded}pt
                              </span>
                            )}
                          </span>
                        ) : matchStarted ? (
                          <span className="text-amber-700">⚠ al begonnen</span>
                        ) : null}
                      </span>
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
