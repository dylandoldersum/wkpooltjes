import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

type Row = {
  userId: number;
  name: string;
  matchPoints: number;
  bonusPoints: number;
  bracketPoints: number;
  total: number;
  exactScores: number;
};

export default async function RanglijstPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Sum points per user across three sources.
  const matchPts = await db
    .select({
      userId: schema.predictions.userId,
      pts: sql<number>`sum(${schema.predictions.pointsAwarded})`,
      exact: sql<number>`sum(case when ${schema.predictions.pointsAwarded} = 5 then 1 else 0 end)`,
    })
    .from(schema.predictions)
    .groupBy(schema.predictions.userId);

  const bonusPts = await db
    .select({
      userId: schema.bonusAnswers.userId,
      pts: sql<number>`sum(${schema.bonusAnswers.pointsAwarded})`,
    })
    .from(schema.bonusAnswers)
    .groupBy(schema.bonusAnswers.userId);

  const bracketPts = await db
    .select({
      userId: schema.bracketPredictions.userId,
      pts: sql<number>`sum(${schema.bracketPredictions.pointsAwarded})`,
    })
    .from(schema.bracketPredictions)
    .groupBy(schema.bracketPredictions.userId);

  const users = await db.select().from(schema.users);

  const matchMap = new Map(matchPts.map((r) => [r.userId, r]));
  const bonusMap = new Map(bonusPts.map((r) => [r.userId, r.pts]));
  const bracketMap = new Map(bracketPts.map((r) => [r.userId, r.pts]));

  const rows: Row[] = users.map((u) => {
    const m = matchMap.get(u.id);
    const matchPoints = Number(m?.pts ?? 0);
    const exact = Number(m?.exact ?? 0);
    const bp = Number(bonusMap.get(u.id) ?? 0);
    const brp = Number(bracketMap.get(u.id) ?? 0);
    return {
      userId: u.id,
      name: u.name,
      matchPoints,
      bonusPoints: bp,
      bracketPoints: brp,
      total: matchPoints + bp + brp,
      exactScores: exact,
    };
  });

  rows.sort((a, b) => b.total - a.total || b.exactScores - a.exactScores || a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Ranglijst</h1>
        <p className="text-sm text-slate-600">
          Punten worden bijgewerkt zodra de admin uitslagen invoert.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Naam</th>
              <th className="px-4 py-2 text-right">Wedstrijden</th>
              <th className="px-4 py-2 text-right">Bonus</th>
              <th className="px-4 py-2 text-right">Bracket</th>
              <th className="px-4 py-2 text-right">Totaal</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Nog geen deelnemers met punten.
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const isMe = r.userId === user.id;
              return (
                <tr
                  key={r.userId}
                  className={`border-b border-slate-50 ${isMe ? "bg-oranje-50/50" : ""}`}
                >
                  <td className="px-4 py-2 font-medium text-slate-500">{i + 1}</td>
                  <td className="px-4 py-2 font-medium">
                    {r.name} {isMe && <span className="text-xs text-oranje-700">(jij)</span>}
                  </td>
                  <td className="px-4 py-2 text-right">{r.matchPoints}</td>
                  <td className="px-4 py-2 text-right">{r.bonusPoints}</td>
                  <td className="px-4 py-2 text-right">{r.bracketPoints}</td>
                  <td className="px-4 py-2 text-right font-bold">{r.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
