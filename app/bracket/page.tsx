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

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default async function BracketPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slots = await db
    .select()
    .from(schema.bracketSlots)
    .orderBy(asc(schema.bracketSlots.id));

  const teams = await db.select().from(schema.teams).orderBy(asc(schema.teams.name));
  const teamsByGroup = new Map<string, typeof teams>();
  for (const t of teams) {
    if (!t.groupCode) continue;
    if (!teamsByGroup.has(t.groupCode)) teamsByGroup.set(t.groupCode, []);
    teamsByGroup.get(t.groupCode)!.push(t);
  }

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

  // Slots indexeren op slotKey voor snelle lookup per groep
  const slotByKey = new Map(slots.map((s) => [s.slotKey, s]));

  function teamOptions(group?: string) {
    const arr = group ? teamsByGroup.get(group) ?? [] : teams;
    return arr.map((t) => ({ id: t.id, name: t.name, flag: t.flag }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bracket-voorspelling</h1>
        <p className="text-sm text-slate-600">
          Voorspel eerst de poulestanden (laatste 32). Dan: wie haalt R16, kwartfinale,
          halve finale en finale? Hoe verder een team komt, hoe meer punten.
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

      {/* ============ Laatste 32 — poulestanden ============ */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 font-semibold">Laatste 32 — poulestanden</h2>
        <p className="mb-3 text-xs text-slate-500">
          Per poule: kies de poulewinnaar (<strong>3 pt</strong>) en nummer 2 (<strong>2 pt</strong>).
          Daarna: de 8 beste 3e plaatsen die ook doorgaan (<strong>2 pt</strong> per juist team).
          {" "}
          <span className="font-medium text-oranje-700">
            Bonus: +5 pt als je per poule zowel winnaar als nummer 2 correct hebt.
          </span>
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g) => {
            const winnerSlot = slotByKey.get(`gw-${g}`);
            const runnerSlot = slotByKey.get(`gr-${g}`);
            const opts = teamOptions(g);
            return (
              <div key={g} className="rounded-lg border border-slate-100 p-3">
                <div className="mb-2 text-sm font-semibold text-slate-700">Poule {g}</div>
                {winnerSlot && (
                  <BracketForm
                    slotId={winnerSlot.id}
                    label="Winnaar"
                    locked={locked}
                    teams={opts}
                    initialTeamId={pickMap.get(winnerSlot.id)?.teamId ?? null}
                    actualTeamId={winnerSlot.actualTeamId ?? null}
                    pointsAwarded={pickMap.get(winnerSlot.id)?.pointsAwarded ?? 0}
                  />
                )}
                <div className="mt-2">
                  {runnerSlot && (
                    <BracketForm
                      slotId={runnerSlot.id}
                      label="Tweede"
                      locked={locked}
                      teams={opts}
                      initialTeamId={pickMap.get(runnerSlot.id)?.teamId ?? null}
                      actualTeamId={runnerSlot.actualTeamId ?? null}
                      pointsAwarded={pickMap.get(runnerSlot.id)?.pointsAwarded ?? 0}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Beste 3e plaatsen (8 van 12)</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(byStage.get("best-third") ?? []).map((s) => (
              <BracketForm
                key={s.id}
                slotId={s.id}
                label={s.label}
                locked={locked}
                teams={teamOptions()}
                initialTeamId={pickMap.get(s.id)?.teamId ?? null}
                actualTeamId={s.actualTeamId ?? null}
                pointsAwarded={pickMap.get(s.id)?.pointsAwarded ?? 0}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============ Knockout: R16 → Finale ============ */}
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
                    teams={teamOptions()}
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
