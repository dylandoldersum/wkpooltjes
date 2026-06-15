import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";

const DEFAULT_BRACKET_LOCK = "2026-06-28T17:00:00+02:00";

export async function getBracketLockStatus(): Promise<{
  lockAt: Date;
  forceLocked: boolean;
  locked: boolean;
}> {
  const [lockSetting] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "tournament_locks_at"));
  const [forceLockSetting] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "bracket_force_locked"));

  const lockAt = lockSetting ? new Date(lockSetting.value) : new Date(DEFAULT_BRACKET_LOCK);
  const forceLocked = forceLockSetting?.value === "true";
  const locked = forceLocked || lockAt.getTime() <= Date.now();
  return { lockAt, forceLocked, locked };
}
