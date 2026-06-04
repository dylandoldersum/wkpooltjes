import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { AdminBonusRow } from "./AdminBonusRow";

export default async function AdminBonus() {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) redirect("/");

  const questions = await db
    .select()
    .from(schema.bonusQuestions)
    .orderBy(asc(schema.bonusQuestions.sortOrder));

  const teams = await db.select().from(schema.teams).orderBy(asc(schema.teams.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin · Bonusvragen</h1>
        <p className="text-sm text-slate-600">
          Zet hier het juiste antwoord (na afloop) of pas de lock-datum aan.
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((q) => (
          <AdminBonusRow
            key={q.id}
            questionId={q.id}
            question={q.question}
            type={q.type as "team" | "text" | "number" | "player"}
            points={q.points}
            initialCorrect={q.correctAnswer ?? ""}
            initialLocksAt={q.locksAt.toISOString().slice(0, 16)}
            teams={teams.map((t) => ({ id: t.id, name: t.name, flag: t.flag }))}
          />
        ))}
      </div>
    </div>
  );
}
