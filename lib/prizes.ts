import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";

const SETTINGS_KEY = "prizes_text";

const DEFAULT_PRIZES = `🥇 1e plaats — eeuwige roem
🥈 2e plaats — eer
🥉 3e plaats — een schouderklopje
🎯 Beste bonusvragen — taart van de winnaar
🍀 Houten lepel (laatste) — moet drankjes halen tijdens de finale`;

export async function getPrizesText(): Promise<string> {
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, SETTINGS_KEY));
  return row?.value ?? DEFAULT_PRIZES;
}

export async function setPrizesText(text: string): Promise<void> {
  await db
    .insert(schema.settings)
    .values({ key: SETTINGS_KEY, value: text })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: text },
    });
}

/**
 * Parse prijzen-tekst: één regel per prijs. Format: "<emoji> <tekst>".
 * Lege regels worden overgeslagen.
 */
export function parsePrizes(text: string): Array<{ emoji: string; description: string }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Eerste 'token' is een emoji of een paar tekens, rest is beschrijving
      const match = line.match(/^(\S+)\s+(.+)$/);
      if (match) return { emoji: match[1], description: match[2] };
      return { emoji: "•", description: line };
    });
}
