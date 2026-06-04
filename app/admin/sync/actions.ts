"use server";

import { requireAdmin } from "@/lib/auth";
import { syncResultsFromApi, type SyncResult } from "@/lib/sync";
import { revalidatePath } from "next/cache";

export async function runManualSync(): Promise<
  { ok: true; result: SyncResult } | { ok: false; error: string }
> {
  await requireAdmin();
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "FOOTBALL_DATA_API_KEY ontbreekt in env" };
  }
  try {
    const result = await syncResultsFromApi(apiKey);
    revalidatePath("/wedstrijden");
    revalidatePath("/ranglijst");
    revalidatePath("/admin");
    revalidatePath("/admin/wedstrijden");
    return { ok: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Onbekende fout";
    return { ok: false, error: msg };
  }
}
