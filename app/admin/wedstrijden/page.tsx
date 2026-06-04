import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatDateLong, formatTime, dateKey } from "@/lib/format";
import { AdminMatchRow } from "./AdminMatchRow";

export default async function AdminWedstrijden() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  const matches = await db.select().from(schema.matches).orderBy(asc(schema.matches.kickoff));
  const teamMap = new Map((await db.select().from(schema.teams)).map((t) => [t.id, t]));

  const byDate = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = dateKey(m.kickoff);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(m);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin · Uitslagen</h1>
        <p className="text-sm text-slate-600">
          Vul de score in en klik op "Afronden" om punten toe te kennen.
        </p>
      </div>

      {[...byDate.entries()].map(([key, dayMatches]) => (
        <section key={key} className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold capitalize text-slate-700">
            {formatDateLong(dayMatches[0].kickoff)}
          </h2>
          <div className="space-y-2">
            {dayMatches.map((m) => {
              const home = m.homeTeamId ? teamMap.get(m.homeTeamId) : null;
              const away = m.awayTeamId ? teamMap.get(m.awayTeamId) : null;
              return (
                <AdminMatchRow
                  key={m.id}
                  matchId={m.id}
                  kickoffTime={formatTime(m.kickoff)}
                  kickoffIso={m.kickoff.toISOString()}
                  homeName={home ? `${home.flag} ${home.name}` : (m.homeLabel ?? "?")}
                  awayName={away ? `${away.flag} ${away.name}` : (m.awayLabel ?? "?")}
                  initialHome={m.homeGoals}
                  initialAway={m.awayGoals}
                  initialFinished={m.finished}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
