"use server";

import { z } from "zod";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { recalcMatchPredictions } from "@/lib/recalc";
import { revalidatePath } from "next/cache";

const ResultSchema = z.object({
  matchId: z.number().int().positive(),
  homeGoals: z.number().int().min(0).max(20).nullable(),
  awayGoals: z.number().int().min(0).max(20).nullable(),
  finished: z.boolean(),
});

export async function setMatchResult(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = ResultSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  const { matchId, homeGoals, awayGoals, finished } = parsed.data;
  await db
    .update(schema.matches)
    .set({ homeGoals, awayGoals, finished })
    .where(eq(schema.matches.id, matchId));
  await recalcMatchPredictions(matchId);
  revalidatePath("/wedstrijden");
  revalidatePath("/ranglijst");
  return { ok: true };
}

const KickoffSchema = z.object({
  matchId: z.number().int().positive(),
  kickoff: z.string().datetime(),
});

export async function setMatchKickoff(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = KickoffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige datum" };
  await db
    .update(schema.matches)
    .set({ kickoff: new Date(parsed.data.kickoff) })
    .where(eq(schema.matches.id, parsed.data.matchId));
  revalidatePath("/wedstrijden");
  revalidatePath("/admin/wedstrijden");
  return { ok: true };
}
