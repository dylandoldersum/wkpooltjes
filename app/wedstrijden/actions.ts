"use server";

import { z } from "zod";
import { db, schema } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

const SaveSchema = z.object({
  matchId: z.number().int().positive(),
  homeGoals: z.number().int().min(0).max(20),
  awayGoals: z.number().int().min(0).max(20),
});

export async function savePrediction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  const { matchId, homeGoals, awayGoals } = parsed.data;

  const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId));
  if (!match) return { ok: false, error: "Wedstrijd niet gevonden" };
  if (match.kickoff.getTime() <= Date.now()) return { ok: false, error: "Wedstrijd is al begonnen" };
  if (!match.homeTeamId || !match.awayTeamId) return { ok: false, error: "Teams nog niet bekend" };

  const existing = await db
    .select()
    .from(schema.predictions)
    .where(and(eq(schema.predictions.userId, user.id), eq(schema.predictions.matchId, matchId)));

  if (existing.length === 0) {
    await db.insert(schema.predictions).values({
      userId: user.id,
      matchId,
      homeGoals,
      awayGoals,
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(schema.predictions)
      .set({ homeGoals, awayGoals, updatedAt: new Date() })
      .where(and(eq(schema.predictions.userId, user.id), eq(schema.predictions.matchId, matchId)));
  }
  return { ok: true };
}
