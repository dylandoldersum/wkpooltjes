import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/db/client";
import { asc } from "drizzle-orm";
import { getBracketLockStatus } from "@/lib/locks";
import { InstellingenForm } from "./InstellingenForm";

export default async function AdminInstellingen() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  const { lockAt, forceLocked, locked } = await getBracketLockStatus();
  const bonusQuestions = await db
    .select()
    .from(schema.bonusQuestions)
    .orderBy(asc(schema.bonusQuestions.sortOrder));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin · Instellingen</h1>
        <p className="text-sm text-slate-600">
          Pas de sluitingsdatum aan voor de bracket en bonusvragen. Of zet ze direct
          op gesloten met de toggle.
        </p>
      </div>

      <InstellingenForm
        initialBracketLockAt={lockAt.toISOString()}
        initialForceLocked={forceLocked}
        currentlyLocked={locked}
        bonusQuestions={bonusQuestions.map((q) => ({
          id: q.id,
          question: q.question,
          locksAt: q.locksAt.toISOString(),
        }))}
      />
    </div>
  );
}
