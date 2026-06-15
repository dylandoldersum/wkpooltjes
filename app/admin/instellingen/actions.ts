"use server";

import { z } from "zod";
import { db, schema } from "@/db/client";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const BracketSchema = z.object({
  lockAt: z.string().datetime(),
  forceLocked: z.boolean(),
});

export async function saveBracketLock(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = BracketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  await upsert("tournament_locks_at", parsed.data.lockAt);
  await upsert("bracket_force_locked", parsed.data.forceLocked ? "true" : "false");

  revalidatePath("/bracket");
  revalidatePath("/admin/instellingen");
  revalidatePath("/admin");
  return { ok: true };
}

const BonusBulkSchema = z.object({
  locksAt: z.string().datetime(),
});

export async function saveBonusBulkLock(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = BonusBulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };

  await db
    .update(schema.bonusQuestions)
    .set({ locksAt: new Date(parsed.data.locksAt) });

  revalidatePath("/bonus");
  revalidatePath("/admin/bonus");
  revalidatePath("/admin/instellingen");
  return { ok: true };
}

async function upsert(key: string, value: string) {
  await db
    .insert(schema.settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value },
    });
}
