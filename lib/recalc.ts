import { db, schema } from "@/db/client";
import { and, eq, inArray } from "drizzle-orm";
import { scoreForPrediction } from "./scoring";

// Bonus wanneer zowel winnaar als nummer 2 van een poule correct voorspeld.
export const GROUP_BONUS_POINTS = 5;

/**
 * Recalculate points for all predictions on a single match.
 * Call when admin sets the final score.
 */
export async function recalcMatchPredictions(matchId: number) {
  const [match] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId));
  if (!match) return;

  const preds = await db
    .select()
    .from(schema.predictions)
    .where(eq(schema.predictions.matchId, matchId));

  if (match.homeGoals === null || match.awayGoals === null || !match.finished) {
    // Match not finished — reset all to 0
    for (const p of preds) {
      if (p.pointsAwarded !== 0) {
        await db
          .update(schema.predictions)
          .set({ pointsAwarded: 0 })
          .where(
            and(
              eq(schema.predictions.userId, p.userId),
              eq(schema.predictions.matchId, matchId),
            ),
          );
      }
    }
    return;
  }

  for (const p of preds) {
    const pts = scoreForPrediction(p.homeGoals, p.awayGoals, match.homeGoals, match.awayGoals);
    if (pts !== p.pointsAwarded) {
      await db
        .update(schema.predictions)
        .set({ pointsAwarded: pts })
        .where(
          and(
            eq(schema.predictions.userId, p.userId),
            eq(schema.predictions.matchId, matchId),
          ),
        );
    }
  }
}

/**
 * Recalculate points for a bonus question.
 */
export async function recalcBonusQuestion(questionId: number) {
  const [q] = await db.select().from(schema.bonusQuestions).where(eq(schema.bonusQuestions.id, questionId));
  if (!q) return;
  const answers = await db
    .select()
    .from(schema.bonusAnswers)
    .where(eq(schema.bonusAnswers.questionId, questionId));

  if (!q.correctAnswer) {
    for (const a of answers) {
      if (a.pointsAwarded !== 0) {
        await db
          .update(schema.bonusAnswers)
          .set({ pointsAwarded: 0 })
          .where(
            and(
              eq(schema.bonusAnswers.userId, a.userId),
              eq(schema.bonusAnswers.questionId, questionId),
            ),
          );
      }
    }
    return;
  }

  const correct = q.correctAnswer.trim().toLowerCase();
  for (const a of answers) {
    const isMatch = a.answer.trim().toLowerCase() === correct;
    const pts = isMatch ? q.points : 0;
    if (pts !== a.pointsAwarded) {
      await db
        .update(schema.bonusAnswers)
        .set({ pointsAwarded: pts })
        .where(
          and(
            eq(schema.bonusAnswers.userId, a.userId),
            eq(schema.bonusAnswers.questionId, questionId),
          ),
        );
    }
  }
}

// Stages where slot positie ertoe doet (winnaar poule C ≠ winnaar poule G)
const EXACT_SLOT_STAGES = new Set(["group-winner", "group-runner-up"]);

/**
 * Recalculate points for a bracket slot.
 */
export async function recalcBracketSlot(slotId: number) {
  const [slot] = await db.select().from(schema.bracketSlots).where(eq(schema.bracketSlots.id, slotId));
  if (!slot) return;
  const picks = await db
    .select()
    .from(schema.bracketPredictions)
    .where(eq(schema.bracketPredictions.slotId, slotId));

  if (!slot.actualTeamId) {
    for (const p of picks) {
      if (p.pointsAwarded !== 0) {
        await db
          .update(schema.bracketPredictions)
          .set({ pointsAwarded: 0 })
          .where(
            and(
              eq(schema.bracketPredictions.userId, p.userId),
              eq(schema.bracketPredictions.slotId, slotId),
            ),
          );
      }
    }
    return;
  }

  // Voor slot-specifieke stages (poulewinnaar/runner-up): exacte match per slot.
  if (EXACT_SLOT_STAGES.has(slot.stage)) {
    for (const p of picks) {
      const pts = p.teamId === slot.actualTeamId ? slot.points : 0;
      if (pts !== p.pointsAwarded) {
        await db
          .update(schema.bracketPredictions)
          .set({ pointsAwarded: pts })
          .where(
            and(
              eq(schema.bracketPredictions.userId, p.userId),
              eq(schema.bracketPredictions.slotId, slotId),
            ),
          );
      }
    }
    // Trigger group-bonus recalc voor deze poule
    // slotKey format: gw-A, gr-A → groupCode = A
    const groupCode = slot.slotKey.split("-")[1];
    if (groupCode) {
      await recalcGroupBonusForGroup(groupCode);
    }
    return;
  }

  // Voor interchangeable stages (r16, qf, sf, final, best-third): "any match in stage" logic.
  // Een user krijgt punten als één van hun picks in deze stage de actual team noemt.
  // Dezelfde team meerdere keren pickken levert max één keer punten op (op de slot met laagste ID).
  const picksInStage = await db
    .select({
      userId: schema.bracketPredictions.userId,
      teamId: schema.bracketPredictions.teamId,
      slotId: schema.bracketPredictions.slotId,
    })
    .from(schema.bracketPredictions)
    .innerJoin(
      schema.bracketSlots,
      eq(schema.bracketPredictions.slotId, schema.bracketSlots.id),
    )
    .where(eq(schema.bracketSlots.stage, slot.stage));

  const claimedByUser = new Map<number, number>(); // userId -> slotId that gets the points
  for (const p of picksInStage) {
    if (p.teamId !== slot.actualTeamId) continue;
    const current = claimedByUser.get(p.userId);
    if (current === undefined || p.slotId < current) {
      claimedByUser.set(p.userId, p.slotId);
    }
  }

  for (const p of picks) {
    const claim = claimedByUser.get(p.userId);
    const pts = claim === slot.id ? slot.points : 0;
    if (pts !== p.pointsAwarded) {
      await db
        .update(schema.bracketPredictions)
        .set({ pointsAwarded: pts })
        .where(
          and(
            eq(schema.bracketPredictions.userId, p.userId),
            eq(schema.bracketPredictions.slotId, slotId),
          ),
        );
    }
  }
}

export async function recalcAllForStage(stage: string) {
  const slots = await db
    .select()
    .from(schema.bracketSlots)
    .where(eq(schema.bracketSlots.stage, stage));
  for (const s of slots) {
    await recalcBracketSlot(s.id);
  }
}

/**
 * Recalculate group bonus voor één specifieke poule.
 * Een gebruiker krijgt GROUP_BONUS_POINTS als hun voorspelling voor gw-X EN gr-X beiden correct zijn.
 */
export async function recalcGroupBonusForGroup(groupCode: string) {
  const [winnerSlot] = await db
    .select()
    .from(schema.bracketSlots)
    .where(eq(schema.bracketSlots.slotKey, `gw-${groupCode}`));
  const [runnerSlot] = await db
    .select()
    .from(schema.bracketSlots)
    .where(eq(schema.bracketSlots.slotKey, `gr-${groupCode}`));
  if (!winnerSlot || !runnerSlot) return;

  // Haal alle picks voor beide slots op
  const allPicks = await db
    .select()
    .from(schema.bracketPredictions)
    .where(
      inArray(schema.bracketPredictions.slotId, [winnerSlot.id, runnerSlot.id]),
    );

  // Index per user
  const byUser = new Map<number, { winner?: number; runner?: number }>();
  for (const p of allPicks) {
    if (!byUser.has(p.userId)) byUser.set(p.userId, {});
    const entry = byUser.get(p.userId)!;
    if (p.slotId === winnerSlot.id) entry.winner = p.teamId;
    if (p.slotId === runnerSlot.id) entry.runner = p.teamId;
  }

  const winnerActual = winnerSlot.actualTeamId;
  const runnerActual = runnerSlot.actualTeamId;

  // Bestaande bonus-rijen voor deze poule ophalen
  const existing = await db
    .select()
    .from(schema.groupBonuses)
    .where(eq(schema.groupBonuses.groupCode, groupCode));
  const existingByUser = new Map(existing.map((b) => [b.userId, b]));

  for (const [userId, picks] of byUser) {
    const bothCorrect =
      winnerActual !== null &&
      runnerActual !== null &&
      picks.winner === winnerActual &&
      picks.runner === runnerActual;
    const pts = bothCorrect ? GROUP_BONUS_POINTS : 0;

    const existingRow = existingByUser.get(userId);
    if (existingRow) {
      if (existingRow.pointsAwarded !== pts) {
        await db
          .update(schema.groupBonuses)
          .set({ pointsAwarded: pts, updatedAt: new Date() })
          .where(
            and(
              eq(schema.groupBonuses.userId, userId),
              eq(schema.groupBonuses.groupCode, groupCode),
            ),
          );
      }
    } else if (pts > 0) {
      await db.insert(schema.groupBonuses).values({
        userId,
        groupCode,
        pointsAwarded: pts,
      });
    }
  }

  // Edge case: bestaande bonus-rijen waarvan de user nu geen picks meer heeft → op 0 zetten
  for (const [userId, bonus] of existingByUser) {
    if (!byUser.has(userId) && bonus.pointsAwarded !== 0) {
      await db
        .update(schema.groupBonuses)
        .set({ pointsAwarded: 0 })
        .where(
          and(
            eq(schema.groupBonuses.userId, userId),
            eq(schema.groupBonuses.groupCode, groupCode),
          ),
        );
    }
  }
}
