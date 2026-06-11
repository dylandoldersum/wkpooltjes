import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db, schema } from "@/db/client";
import { and, asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { formatDateLong, formatTime, dateKey } from "@/lib/format";
import { totoLabel } from "@/lib/scoring";

const STAGE_LABELS: Record<string, string> = {
  "group-winner": "Poulewinnaars",
  "group-runner-up": "Nummer 2's per poule",
  "best-third": "Beste 3e plaatsen",
  r16: "Achtste finalisten",
  qf: "Kwartfinalisten",
  sf: "Halvefinalisten",
  final: "Finalisten",
};

export default async function ViewOtherUser({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const { userId: userIdRaw } = await params;
  const userId = Number(userIdRaw);
  if (!Number.isFinite(userId)) notFound();

  // Lock check: andermans picks alleen zichtbaar na tournament_locks_at
  const [lockSetting] = await db
    .select()
    .from(schema.settings)
    .where(eq(schema.settings.key, "tournament_locks_at"));
  const lockAt = lockSetting ? new Date(lockSetting.value) : null;
  const tournamentLocked = lockAt ? lockAt.getTime() <= Date.now() : false;
  const isViewingSelf = userId === me.id;

  if (!isViewingSelf && !tournamentLocked) {
    return (
      <div className="space-y-4">
        <Link href="/ranglijst" className="text-sm text-oranje-600 hover:underline">
          ← Terug naar ranglijst
        </Link>
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="text-3xl">🔒</div>
          <h1 className="mt-3 text-xl font-bold">Andermans picks zijn nog verborgen</h1>
          <p className="mt-2 text-sm text-slate-600">
            Voorspellingen van anderen worden zichtbaar zodra het toernooi begint
            {lockAt && (
              <>
                {" "}
                (op{" "}
                {new Intl.DateTimeFormat("nl-NL", {
                  timeZone: "Europe/Amsterdam",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(lockAt)}
                )
              </>
            )}
            .
          </p>
        </div>
      </div>
    );
  }

  const [target] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
  if (!target) notFound();

  // Data ophalen
  const [
    matches,
    teams,
    matchPredictions,
    bonusQuestions,
    bonusAnswers,
    bracketSlots,
    bracketPredictions,
  ] = await Promise.all([
    db.select().from(schema.matches).orderBy(asc(schema.matches.kickoff)),
    db.select().from(schema.teams),
    db
      .select()
      .from(schema.predictions)
      .where(eq(schema.predictions.userId, userId)),
    db.select().from(schema.bonusQuestions).orderBy(asc(schema.bonusQuestions.sortOrder)),
    db
      .select()
      .from(schema.bonusAnswers)
      .where(eq(schema.bonusAnswers.userId, userId)),
    db.select().from(schema.bracketSlots).orderBy(asc(schema.bracketSlots.id)),
    db
      .select()
      .from(schema.bracketPredictions)
      .where(eq(schema.bracketPredictions.userId, userId)),
  ]);

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const predByMatch = new Map(matchPredictions.map((p) => [p.matchId, p]));
  const answerByQ = new Map(bonusAnswers.map((a) => [a.questionId, a]));
  const pickBySlot = new Map(bracketPredictions.map((p) => [p.slotId, p]));

  // Filter matches met team-info (zelfde regel als /wedstrijden)
  const visibleMatches = matches.filter(
    (m) =>
      (m.homeTeamId !== null || m.homeLabel) &&
      (m.awayTeamId !== null || m.awayLabel),
  );
  const byDate = new Map<string, typeof visibleMatches>();
  for (const m of visibleMatches) {
    const k = dateKey(m.kickoff);
    if (!byDate.has(k)) byDate.set(k, []);
    byDate.get(k)!.push(m);
  }

  // Bracket per stage
  const slotsByStage = new Map<string, typeof bracketSlots>();
  for (const s of bracketSlots) {
    if (!slotsByStage.has(s.stage)) slotsByStage.set(s.stage, []);
    slotsByStage.get(s.stage)!.push(s);
  }

  const now = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/ranglijst" className="text-sm text-oranje-600 hover:underline">
          ← Ranglijst
        </Link>
        {isViewingSelf && (
          <span className="text-xs text-slate-400">(jouw eigen profiel)</span>
        )}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{target.name}</h1>
        <p className="text-sm text-slate-500">
          {matchPredictions.length} wedstrijdvoorspellingen ·{" "}
          {bonusAnswers.length} bonusantwoorden · {bracketPredictions.length} bracket-picks
        </p>
      </div>

      {/* ============ Wedstrijdvoorspellingen ============ */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Wedstrijdvoorspellingen</h2>
        <div className="space-y-4">
          {[...byDate.entries()].map(([key, dayMatches]) => {
            const sample = dayMatches[0];
            return (
              <div key={key} className="rounded-xl bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold capitalize text-slate-700">
                  {formatDateLong(sample.kickoff)}
                </h3>
                <div className="space-y-1">
                  {dayMatches.map((m) => {
                    const home = m.homeTeamId ? teamById.get(m.homeTeamId) : null;
                    const away = m.awayTeamId ? teamById.get(m.awayTeamId) : null;
                    const pred = predByMatch.get(m.id);
                    const matchStarted = m.kickoff.getTime() <= now;
                    const showPick = isViewingSelf || matchStarted;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded border border-slate-100 px-3 py-1.5 text-sm"
                      >
                        <span className="w-12 text-xs text-slate-400">
                          {formatTime(m.kickoff)}
                        </span>
                        <span className="flex-1 text-right">
                          {home?.flag} {home?.name ?? m.homeLabel}
                        </span>
                        <span className="w-16 text-center font-mono text-slate-700">
                          {showPick && pred ? (
                            `${pred.homeGoals}-${pred.awayGoals}`
                          ) : pred ? (
                            <span className="text-slate-300">●-●</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </span>
                        <span className="flex-1">
                          {away?.name ?? m.awayLabel} {away?.flag}
                        </span>
                        <span className="w-20 text-right text-xs">
                          {m.finished && m.homeGoals !== null && m.awayGoals !== null ? (
                            <>
                              <span className="text-slate-500">
                                {m.homeGoals}-{m.awayGoals}
                              </span>
                              {pred && (
                                <span className="ml-1 rounded bg-oranje-50 px-1 font-medium text-oranje-700">
                                  {pred.pointsAwarded}pt
                                </span>
                              )}
                            </>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============ Bonusantwoorden ============ */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Bonusantwoorden</h2>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="divide-y divide-slate-100">
            {bonusQuestions.map((q) => {
              const answer = answerByQ.get(q.id);
              const locked = q.locksAt.getTime() <= now;
              const showAnswer = isViewingSelf || locked;
              let displayAnswer: string = "—";
              if (answer && showAnswer) {
                if (q.type === "team") {
                  const t = teamById.get(Number(answer.answer));
                  displayAnswer = t ? `${t.flag} ${t.name}` : answer.answer;
                } else {
                  displayAnswer = answer.answer;
                }
              } else if (answer) {
                displayAnswer = "verborgen tot lock";
              }
              return (
                <div key={q.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="flex-1">{q.question}</span>
                  <span className={answer && showAnswer ? "font-medium" : "text-slate-400"}>
                    {displayAnswer}
                  </span>
                  {q.correctAnswer && answer && (
                    <span className="rounded bg-oranje-50 px-1.5 py-0.5 text-xs font-medium text-oranje-700">
                      {answer.pointsAwarded}pt
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ Bracket-picks ============ */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Bracket-picks</h2>
        <div className="space-y-3">
          {[
            "group-winner",
            "group-runner-up",
            "best-third",
            "r16",
            "qf",
            "sf",
            "final",
          ].map((stage) => {
            const slots = slotsByStage.get(stage) ?? [];
            if (slots.length === 0) return null;
            return (
              <div key={stage} className="rounded-xl bg-white p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  {STAGE_LABELS[stage]}
                </h3>
                <div className="grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  {slots.map((s) => {
                    const pick = pickBySlot.get(s.id);
                    const pickedTeam = pick ? teamById.get(pick.teamId) : null;
                    const actualTeam = s.actualTeamId ? teamById.get(s.actualTeamId) : null;
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1">
                        <span className="text-slate-500">{s.label}:</span>
                        <span className="flex items-center gap-1">
                          {pickedTeam ? (
                            <>
                              {pickedTeam.flag} {pickedTeam.name}
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                          {actualTeam && pick && (
                            <span
                              className={`ml-1 rounded px-1 ${
                                pick.teamId === actualTeam.id
                                  ? "bg-green-50 text-green-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {pick.pointsAwarded}pt
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
