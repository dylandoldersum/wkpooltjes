"use server";

import { z } from "zod";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { recalcBonusQuestion } from "@/lib/recalc";
import { revalidatePath } from "next/cache";

const CorrectSchema = z.object({
  questionId: z.number().int().positive(),
  correctAnswer: z.string().max(120),
});

export async function setBonusCorrect(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = CorrectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  await db
    .update(schema.bonusQuestions)
    .set({ correctAnswer: parsed.data.correctAnswer || null })
    .where(eq(schema.bonusQuestions.id, parsed.data.questionId));
  await recalcBonusQuestion(parsed.data.questionId);
  revalidatePath("/bonus");
  revalidatePath("/ranglijst");
  return { ok: true };
}

const LocksSchema = z.object({
  questionId: z.number().int().positive(),
  locksAt: z.string().datetime(),
});

export async function setBonusLocksAt(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = LocksSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige datum" };
  await db
    .update(schema.bonusQuestions)
    .set({ locksAt: new Date(parsed.data.locksAt) })
    .where(eq(schema.bonusQuestions.id, parsed.data.questionId));
  revalidatePath("/bonus");
  return { ok: true };
}
