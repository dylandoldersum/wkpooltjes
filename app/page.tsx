import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/db/client";
import { sql } from "drizzle-orm";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [{ count: teamCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.teams);
  const [{ count: matchCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.matches);
  const [{ count: userCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.users);

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">WK 2026 Pooltjes</h1>
        <p className="mt-2 text-slate-600">
          Voorspel scores, vul bonusvragen in en bouw je bracket. Wie scoort het hoogst op kantoor?
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          <div className="rounded-lg bg-oranje-50 px-4 py-3">
            <div className="text-2xl font-bold text-oranje-600">{teamCount}</div>
            <div className="text-slate-600">deelnemende landen</div>
          </div>
          <div className="rounded-lg bg-oranje-50 px-4 py-3">
            <div className="text-2xl font-bold text-oranje-600">{matchCount}</div>
            <div className="text-slate-600">wedstrijden</div>
          </div>
          <div className="rounded-lg bg-oranje-50 px-4 py-3">
            <div className="text-2xl font-bold text-oranje-600">{userCount}</div>
            <div className="text-slate-600">deelnemers</div>
          </div>
        </div>
        <div className="mt-6">
          {user ? (
            <Link
              href="/wedstrijden"
              className="inline-block rounded-lg bg-oranje px-5 py-3 font-medium text-white hover:bg-oranje-600"
            >
              Naar voorspellingen →
            </Link>
          ) : (
            <Link
              href="/signup"
              className="inline-block rounded-lg bg-oranje px-5 py-3 font-medium text-white hover:bg-oranje-600"
            >
              Account aanmaken →
            </Link>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="text-2xl">⚽</div>
          <h2 className="mt-2 font-semibold">Uitslagen voorspellen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Per wedstrijd voorspel je de score. Juiste score = 5 pt, juiste toto = 2 pt.
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="text-2xl">🎯</div>
          <h2 className="mt-2 font-semibold">Bonusvragen</h2>
          <p className="mt-1 text-sm text-slate-600">
            Wie wordt kampioen? Topscorer? Vul ze in vóór het toernooi begint.
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="text-2xl">🥇</div>
          <h2 className="mt-2 font-semibold">Knockout bracket</h2>
          <p className="mt-1 text-sm text-slate-600">
            Vul je bracket in vanaf de 1/8 finales. Hoe verder je teams komen, hoe meer punten.
          </p>
        </div>
      </section>
    </div>
  );
}
