import { db, schema } from "@/db/client";
import { asc } from "drizzle-orm";
import { formatDateLong, formatTime, dateKey } from "@/lib/format";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default async function PoulesPage() {
  const teams = await db.select().from(schema.teams).orderBy(asc(schema.teams.name));
  const matches = await db
    .select()
    .from(schema.matches)
    .orderBy(asc(schema.matches.kickoff));

  const teamsByGroup = new Map<string, typeof teams>();
  for (const t of teams) {
    if (!t.groupCode) continue;
    if (!teamsByGroup.has(t.groupCode)) teamsByGroup.set(t.groupCode, []);
    teamsByGroup.get(t.groupCode)!.push(t);
  }

  const matchesByGroup = new Map<string, typeof matches>();
  for (const m of matches) {
    if (!m.groupCode || m.stage !== "group") continue;
    if (!matchesByGroup.has(m.groupCode)) matchesByGroup.set(m.groupCode, []);
    matchesByGroup.get(m.groupCode)!.push(m);
  }

  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Poules WK 2026</h1>
        <p className="text-sm text-slate-600">
          48 teams verdeeld over 12 poules. Top 2 per poule + 8 beste 3e plaatsen door naar
          de laatste 32.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((g) => {
          const groupTeams = teamsByGroup.get(g) ?? [];
          const groupMatches = matchesByGroup.get(g) ?? [];
          return (
            <section key={g} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
                <h2 className="text-lg font-bold">Poule {g}</h2>
                <span className="text-xs text-slate-400">
                  {groupTeams.length} teams · {groupMatches.length} wedstrijden
                </span>
              </div>

              <ul className="mt-3 space-y-1.5">
                {groupTeams.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="text-lg">{t.flag}</span>
                    <span className="font-medium">{t.name}</span>
                  </li>
                ))}
              </ul>

              {groupMatches.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
                    Wedstrijden
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {groupMatches.map((m) => {
                      const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
                      const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
                      return (
                        <div key={m.id} className="flex items-center gap-2">
                          <span className="w-16 text-slate-400">
                            {formatTime(m.kickoff)}
                          </span>
                          <span className="flex-1 truncate">
                            {home?.flag} {home?.name} vs {away?.flag} {away?.name}
                          </span>
                          {m.finished && m.homeGoals !== null && m.awayGoals !== null && (
                            <span className="rounded bg-slate-100 px-1.5 font-mono text-slate-700">
                              {m.homeGoals}-{m.awayGoals}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
