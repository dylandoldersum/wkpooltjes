"use server";

import { requireAdmin } from "@/lib/auth";
import { runAiPredictForUser } from "@/lib/ai-predict";
import { revalidatePath } from "next/cache";

export async function runAiPredictForMe(): Promise<
  | {
      ok: true;
      result: Awaited<ReturnType<typeof runAiPredictForUser>>;
    }
  | { ok: false; error: string }
> {
  const user = await requireAdmin();
  const allowed = process.env.AI_PREDICT_EMAIL?.toLowerCase();
  if (!allowed || user.email.toLowerCase() !== allowed) {
    return { ok: false, error: "Niet beschikbaar" };
  }
  try {
    const result = await runAiPredictForUser(user.id);
    revalidatePath("/wedstrijden");
    revalidatePath("/bonus");
    revalidatePath("/bracket");
    revalidatePath("/ranglijst");
    return { ok: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Onbekende fout";
    return { ok: false, error: msg };
  }
}
