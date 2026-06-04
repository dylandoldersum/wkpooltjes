"use server";

import { z } from "zod";
import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { recalcBracketSlot } from "@/lib/recalc";
import { revalidatePath } from "next/cache";

const Schema = z.object({
  slotId: z.number().int().positive(),
  teamId: z.number().int().positive().nullable(),
});

export async function setBracketActual(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  await db
    .update(schema.bracketSlots)
    .set({ actualTeamId: parsed.data.teamId })
    .where(eq(schema.bracketSlots.id, parsed.data.slotId));
  await recalcBracketSlot(parsed.data.slotId);
  revalidatePath("/bracket");
  revalidatePath("/ranglijst");
  return { ok: true };
}
