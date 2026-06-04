"use server";

import { z } from "zod";
import { db, schema } from "@/db/client";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const DeleteSchema = z.object({
  userId: z.number().int().positive(),
});

export async function deleteUser(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const current = await requireAdmin();
  const parsed = DeleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  const { userId } = parsed.data;

  if (userId === current.id) {
    return { ok: false, error: "Je kunt jezelf niet verwijderen" };
  }

  const [target] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!target) return { ok: false, error: "Gebruiker niet gevonden" };

  // Veiligheid: als dit de laatste admin is, niet toestaan
  if (target.isAdmin) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(eq(schema.users.isAdmin, true));
    if (Number(count) <= 1) {
      return { ok: false, error: "Dit is de laatste admin — niet te verwijderen" };
    }
  }

  // Cascade delete is geconfigureerd in schema.ts → voorspellingen, bonus answers
  // en bracket-keuzes verdwijnen automatisch mee
  await db.delete(schema.users).where(eq(schema.users.id, userId));

  revalidatePath("/admin/users");
  revalidatePath("/ranglijst");
  return { ok: true };
}

const ToggleAdminSchema = z.object({
  userId: z.number().int().positive(),
  makeAdmin: z.boolean(),
});

export async function toggleAdmin(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const current = await requireAdmin();
  const parsed = ToggleAdminSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  const { userId, makeAdmin } = parsed.data;

  if (userId === current.id) {
    return { ok: false, error: "Je kunt je eigen rol niet aanpassen" };
  }

  const [target] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!target) return { ok: false, error: "Gebruiker niet gevonden" };

  // Voorkom dat de laatste admin per ongeluk gedemoot wordt
  if (!makeAdmin && target.isAdmin) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(eq(schema.users.isAdmin, true));
    if (Number(count) <= 1) {
      return { ok: false, error: "Dit is de laatste admin — kan niet gedemoot worden" };
    }
  }

  await db.update(schema.users).set({ isAdmin: makeAdmin }).where(eq(schema.users.id, userId));

  revalidatePath("/admin/users");
  return { ok: true };
}
