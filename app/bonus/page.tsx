import { redirect } from "next/navigation";
import { db, schema } from "@/db/client";
import { asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { BonusForm } from "./BonusForm";

export default async function BonusPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const questions = await db
    .select()
    .from(schema.bonusQuestions)
    .orderBy(asc(schema.bonusQuestions.sortOrder));

  const teams = await db.select().from(schema.teams).orderBy(asc(schema.teams.name));

  const answers = await db
    .select()
    .from(schema.bonusAnswers)
    .where(eq(schema.bonusAnswers.userId, user.id));
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bonusvragen</h1>
        <p className="text-sm text-slate-600">
          Vul deze in voordat de eerste wedstrijd begint. Daarna sluiten ze automatisch.
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((q) => {
          const locked = q.locksAt.getTime() <= now.getTime();
          const answer = answerMap.get(q.id);
          return (
            <div key={q.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium">{q.question}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Sluit:{" "}
                    {new Intl.DateTimeFormat("nl-NL", {
                      timeZone: "Europe/Amsterdam",
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(q.locksAt)}{" "}
                    · <strong>{q.points}</strong> pt
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {locked ? "🔒 gesloten" : answer ? "✓ ingevuld" : "—"}
                </div>
              </div>
              <div className="mt-3">
                <BonusForm
                  questionId={q.id}
                  type={q.type as "team" | "text" | "number" | "player"}
                  locked={locked}
                  initial={answer?.answer ?? ""}
                  teams={teams.map((t) => ({ id: t.id, name: t.name, flag: t.flag }))}
                />
                {q.correctAnswer && (
                  <div className="mt-2 text-xs text-slate-500">
                    Juiste antwoord: <strong>{q.correctAnswer}</strong>
                    {answer && (
                      <span className="ml-2 rounded bg-oranje-50 px-1.5 py-0.5 font-medium text-oranje-700">
                        {answer.pointsAwarded} pt
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
