import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { BracketForm } from "./BracketForm";

const STAGE_LABELS: Record<string, string> = {
  r16: "Achtste finales (top 16)",
  qf: "Kwartfinales (top 8)",
  sf: "Halve finales (top 4)",
  final: "Finale (top 2)",
};

export default async function BracketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slots = await db
    .select()
    .from(schema.bracketSlots)
    .orderBy(asc(schema.bracketSlots.id));

  const teams = await db.select().from(schema.teams).orderBy(asc(schema.teams.name));

  const userPicks = await db
    .select()
    .from(schema.bracketPredictions)
    .where(eq(schema.bracketPredictions.userId, user.id));
  const pickMap = new Map(userPicks.map((p) => [p.slotId, p]));

  const [lockSetting] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "tournament_locks_at"));
  const lockAt = lockSetting ? new Date(lockSetting.value) : new Date("2026-06-11T20:00:00+02:00");
  const locked = lockAt.getTime() <= Date.now();

  const byStage = new Map<string, typeof slots>();
  for (const s of slots) {
    if (!byStage.has(s.stage)) byStage.set(s.stage, []);
    byStage.get(s.stage)!.push(s);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knockout bracket</h1>
        <p className="text-sm text-slate-600">
          Voorspel welke teams welke ronde halen. Hoe verder een team komt, hoe meer punten.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {locked ? "🔒 Bracket gesloten." : `Bracket sluit op ${new Intl.DateTimeFormat("nl-NL", {
            timeZone: "Europe/Amsterdam",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          }).format(lockAt)}`}
        </p>
      </div>

      {["r16", "qf", "sf", "final"].map((stage) => {
        const stageSlots = byStage.get(stage) ?? [];
        if (stageSlots.length === 0) return null;
        return (
          <section key={stage} className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">
              {STAGE_LABELS[stage]}{" "}
              <span className="text-xs font-normal text-slate-500">
                ({stageSlots[0].points} pt per juist team)
              </span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {stageSlots.map((s) => {
                const pick = pickMap.get(s.id);
                return (
                  <BracketForm
                    key={s.id}
                    slotId={s.id}
                    label={s.label}
                    locked={locked}
                    teams={teams.map((t) => ({ id: t.id, name: t.name, flag: t.flag }))}
                    initialTeamId={pick?.teamId ?? null}
                    actualTeamId={s.actualTeamId ?? null}
                    pointsAwarded={pick?.pointsAwarded ?? 0}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
