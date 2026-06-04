"use server";

import { z } from "zod";
import { db, schema } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

const SaveSchema = z.object({
  questionId: z.number().int().positive(),
  answer: z.string().min(1).max(120),
});

export async function saveBonusAnswer(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  const { questionId, answer } = parsed.data;

  const [q] = await db.select().from(schema.bonusQuestions).where(eq(schema.bonusQuestions.id, questionId));
  if (!q) return { ok: false, error: "Vraag niet gevonden" };
  if (q.locksAt.getTime() <= Date.now()) return { ok: false, error: "Vraag is gesloten" };

  const existing = await db
    .select()
    .from(schema.bonusAnswers)
    .where(and(eq(schema.bonusAnswers.userId, user.id), eq(schema.bonusAnswers.questionId, questionId)));

  if (existing.length === 0) {
    await db.insert(schema.bonusAnswers).values({
      userId: user.id,
      questionId,
      answer,
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(schema.bonusAnswers)
      .set({ answer, updatedAt: new Date() })
      .where(and(eq(schema.bonusAnswers.userId, user.id), eq(schema.bonusAnswers.questionId, questionId)));
  }
  return { ok: true };
}
