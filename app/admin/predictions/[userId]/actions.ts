"use server";

import { z } from "zod";
import { db, schema } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { recalcMatchPredictions } from "@/lib/recalc";
import { revalidatePath } from "next/cache";

const Schema = z.object({
  userId: z.number().int().positive(),
  matchId: z.number().int().positive(),
  homeGoals: z.number().int().min(0).max(20).nullable(),
  awayGoals: z.number().int().min(0).max(20).nullable(),
});

export async function adminSavePrediction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  const { userId, matchId, homeGoals, awayGoals } = parsed.data;

  // Beide leeg → voorspelling verwijderen
  if (homeGoals === null && awayGoals === null) {
    await db
      .delete(schema.predictions)
      .where(
        and(
          eq(schema.predictions.userId, userId),
          eq(schema.predictions.matchId, matchId),
        ),
      );
    await recalcMatchPredictions(matchId);
    revalidatePath(`/admin/predictions/${userId}`);
    revalidatePath("/ranglijst");
    return { ok: true };
  }

  // Eentje leeg, andere niet → fout
  if (homeGoals === null || awayGoals === null) {
    return { ok: false, error: "Vul beide scores in of laat ze beide leeg" };
  }

  const existing = await db
    .select()
    .from(schema.predictions)
    .where(
      and(
        eq(schema.predictions.userId, userId),
        eq(schema.predictions.matchId, matchId),
      ),
    );

  if (existing.length === 0) {
    await db.insert(schema.predictions).values({
      userId,
      matchId,
      homeGoals,
      awayGoals,
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(schema.predictions)
      .set({ homeGoals, awayGoals, updatedAt: new Date() })
      .where(
        and(
          eq(schema.predictions.userId, userId),
          eq(schema.predictions.matchId, matchId),
        ),
      );
  }

  await recalcMatchPredictions(matchId);
  revalidatePath(`/admin/predictions/${userId}`);
  revalidatePath("/ranglijst");
  revalidatePath("/wedstrijden");
  return { ok: true };
}
