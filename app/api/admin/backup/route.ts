import { NextResponse } from "next/server";
import { db, schema } from "@/db/client";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();

  // Verzamel alles. Password-hashes worden expliciet weggelaten.
  const [
    users,
    teams,
    matches,
    predictions,
    bonusQuestions,
    bonusAnswers,
    bracketSlots,
    bracketPredictions,
    groupBonuses,
    settings,
  ] = await Promise.all([
    db.select().from(schema.users),
    db.select().from(schema.teams),
    db.select().from(schema.matches),
    db.select().from(schema.predictions),
    db.select().from(schema.bonusQuestions),
    db.select().from(schema.bonusAnswers),
    db.select().from(schema.bracketSlots),
    db.select().from(schema.bracketPredictions),
    db.select().from(schema.groupBonuses),
    db.select().from(schema.settings),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
    })),
    teams,
    matches,
    predictions,
    bonusQuestions,
    bonusAnswers,
    bracketSlots,
    bracketPredictions,
    groupBonuses,
    settings,
  };

  const json = JSON.stringify(backup, null, 2);
  const today = new Date().toISOString().slice(0, 10);
  const filename = `wkpool-backup-${today}.json`;

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
