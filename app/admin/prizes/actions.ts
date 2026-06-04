"use server";

import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { setPrizesText } from "@/lib/prizes";
import { revalidatePath } from "next/cache";

const Schema = z.object({
  text: z.string().max(4000),
});

export async function savePrizes(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ongeldige invoer" };
  await setPrizesText(parsed.data.text);
  revalidatePath("/");
  revalidatePath("/admin/prizes");
  return { ok: true };
}
