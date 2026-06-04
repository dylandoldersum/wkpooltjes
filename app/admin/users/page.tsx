import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { asc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { UserRow } from "./UserRow";

export default async function AdminUsers() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  // Per gebruiker tellen hoeveel voorspellingen ze hebben
  const users = await db.select().from(schema.users).orderBy(asc(schema.users.createdAt));

  const predCounts = await db
    .select({
      userId: schema.predictions.userId,
      count: sql<number>`count(*)`,
    })
    .from(schema.predictions)
    .groupBy(schema.predictions.userId);
  const predMap = new Map(predCounts.map((r) => [r.userId, Number(r.count)]));

  const bonusCounts = await db
    .select({
      userId: schema.bonusAnswers.userId,
      count: sql<number>`count(*)`,
    })
    .from(schema.bonusAnswers)
    .groupBy(schema.bonusAnswers.userId);
  const bonusMap = new Map(bonusCounts.map((r) => [r.userId, Number(r.count)]));

  const bracketCounts = await db
    .select({
      userId: schema.bracketPredictions.userId,
      count: sql<number>`count(*)`,
    })
    .from(schema.bracketPredictions)
    .groupBy(schema.bracketPredictions.userId);
  const bracketMap = new Map(bracketCounts.map((r) => [r.userId, Number(r.count)]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admin · Gebruikers</h1>
        <p className="text-sm text-slate-600">
          {users.length} gebruiker{users.length === 1 ? "" : "s"} totaal. Verwijderen wist ook
          alle voorspellingen, bonusantwoorden en bracket-keuzes van die gebruiker.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Naam</th>
              <th className="px-4 py-2">E-mail</th>
              <th className="px-4 py-2 text-center">Rol</th>
              <th className="px-4 py-2 text-right">Wedstr.</th>
              <th className="px-4 py-2 text-right">Bonus</th>
              <th className="px-4 py-2 text-right">Bracket</th>
              <th className="px-4 py-2 text-right">Aangemaakt</th>
              <th className="px-4 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={{
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  isAdmin: u.isAdmin,
                  createdAt: u.createdAt.toISOString(),
                }}
                isSelf={u.id === user.id}
                stats={{
                  predictions: predMap.get(u.id) ?? 0,
                  bonus: bonusMap.get(u.id) ?? 0,
                  bracket: bracketMap.get(u.id) ?? 0,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
