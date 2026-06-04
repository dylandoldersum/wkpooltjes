"use server";

import { z } from "zod";
import { db, schema } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

const SaveSchema = z.object({
  slotId: z.number().int().positive(),
  teamId: z.number().int().positive(),
});

export async function saveBracketPick(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  const { slotId, teamId } = parsed.data;

  const [slot] = await db.select().from(schema.bracketSlots).where(eq(schema.bracketSlots.id, slotId));
  if (!slot) return { ok: false, error: "Slot niet gevonden" };

  const [lockSetting] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "tournament_locks_at"));
  const lockAt = lockSetting ? new Date(lockSetting.value) : null;
  if (lockAt && lockAt.getTime() <= Date.now()) {
    return { ok: false, error: "Bracket is gesloten" };
  }

  const existing = await db
    .select()
    .from(schema.bracketPredictions)
    .where(
      and(
        eq(schema.bracketPredictions.userId, user.id),
        eq(schema.bracketPredictions.slotId, slotId),
      ),
    );

  if (existing.length === 0) {
    await db.insert(schema.bracketPredictions).values({
      userId: user.id,
      slotId,
      teamId,
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(schema.bracketPredictions)
      .set({ teamId, updatedAt: new Date() })
      .where(
        and(
          eq(schema.bracketPredictions.userId, user.id),
          eq(schema.bracketPredictions.slotId, slotId),
        ),
      );
  }
  return { ok: true };
}
