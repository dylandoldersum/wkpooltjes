import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AdminBracketRow } from "./AdminBracketRow";

const STAGE_LABELS: Record<string, string> = {
  "group-winner": "Poulewinnaars (1e plaatsen)",
  "group-runner-up": "Nummer 2's per poule",
  "best-third": "Beste 3e plaatsen",
  r16: "Achtste finales",
  qf: "Kwartfinales",
  sf: "Halve finales",
  final: "Finale",
};

export default async function AdminBracket() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  const slots = await db.select().from(schema.bracketSlots).orderBy(asc(schema.bracketSlots.id));
  const teams = await db.select().from(schema.teams).orderBy(asc(schema.teams.name));

  const byStage = new Map<string, typeof slots>();
  for (const s of slots) {
    if (!byStage.has(s.stage)) byStage.set(s.stage, []);
    byStage.get(s.stage)!.push(s);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin · Bracket</h1>
        <p className="text-sm text-slate-600">
          Koppel teams aan slots zodra duidelijk is welke teams een ronde halen.
        </p>
      </div>

      {["group-winner", "group-runner-up", "best-third", "r16", "qf", "sf", "final"].map((stage) => {
        const stageSlots = byStage.get(stage) ?? [];
        if (stageSlots.length === 0) return null;
        return (
          <section key={stage} className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold">
              {STAGE_LABELS[stage]}{" "}
              <span className="text-xs font-normal text-slate-500">
                ({stageSlots[0].points} pt per slot)
              </span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {stageSlots.map((s) => (
                <AdminBracketRow
                  key={s.id}
                  slotId={s.id}
                  label={s.label}
                  initialTeamId={s.actualTeamId ?? null}
                  teams={teams.map((t) => ({ id: t.id, name: t.name, flag: t.flag }))}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
