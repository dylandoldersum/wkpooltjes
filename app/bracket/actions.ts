"use server";

import { z } from "zod";
import { db, schema } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import {
  computePredictedStandings,
  computePredictedBestThirds,
} from "@/lib/predicted-standings";
import { getBracketLockStatus } from "@/lib/locks";
import { revalidatePath } from "next/cache";

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

  const { locked } = await getBracketLockStatus();
  if (locked) {
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

/**
 * Vul poulewinnaars + nr 2 + beste 3e in op basis van de user's
 * wedstrijdvoorspellingen. Overschrijft bestaande picks voor deze slots.
 */
export async function applyBracketSuggestions(): Promise<{
  ok: boolean;
  error?: string;
  groupsApplied?: number;
  bestThirdsApplied?: number;
}> {
  const user = await requireUser();

  const { locked } = await getBracketLockStatus();
  if (locked) {
    return { ok: false, error: "Bracket is gesloten" };
  }

  const standings = await computePredictedStandings(user.id);
  if (standings.size === 0) {
    return { ok: false, error: "Geen complete poulevoorspellingen gevonden" };
  }

  const allSlots = await db.select().from(schema.bracketSlots);
  const slotByKey = new Map(allSlots.map((s) => [s.slotKey, s]));

  let groupsApplied = 0;
  for (const [groupCode, std] of standings) {
    const winnerSlot = slotByKey.get(`gw-${groupCode}`);
    const runnerSlot = slotByKey.get(`gr-${groupCode}`);
    if (!winnerSlot || !runnerSlot) continue;

    await upsertPick(user.id, winnerSlot.id, std[0].teamId);
    await upsertPick(user.id, runnerSlot.id, std[1].teamId);
    groupsApplied++;
  }

  let bestThirdsApplied = 0;
  const best3 = computePredictedBestThirds(standings);
  if (best3) {
    for (let i = 0; i < best3.length; i++) {
      const slot = slotByKey.get(`bt-${i + 1}`);
      if (!slot) continue;
      await upsertPick(user.id, slot.id, best3[i].teamId);
      bestThirdsApplied++;
    }
  }

  revalidatePath("/bracket");
  return { ok: true, groupsApplied, bestThirdsApplied };
}

async function upsertPick(userId: number, slotId: number, teamId: number) {
  const existing = await db
    .select()
    .from(schema.bracketPredictions)
    .where(
      and(
        eq(schema.bracketPredictions.userId, userId),
        eq(schema.bracketPredictions.slotId, slotId),
      ),
    );
  if (existing.length === 0) {
    await db.insert(schema.bracketPredictions).values({
      userId,
      slotId,
      teamId,
      updatedAt: new Date(),
    });
  } else if (existing[0].teamId !== teamId) {
    await db
      .update(schema.bracketPredictions)
      .set({ teamId, updatedAt: new Date() })
      .where(
        and(
          eq(schema.bracketPredictions.userId, userId),
          eq(schema.bracketPredictions.slotId, slotId),
        ),
      );
  }
}
