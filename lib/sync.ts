import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { fetchWcMatches, normalizeTla, type FdMatch } from "./football-data";
import { recalcMatchPredictions } from "./recalc";

export type SyncResult = {
  totalFromApi: number;
  finishedFromApi: number;
  updated: number;
  alreadyUpToDate: number;
  unmatched: number;
  unmatchedSamples: Array<{ home: string | null; away: string | null; utcDate: string }>;
};

const MATCH_WINDOW_MS = 48 * 60 * 60 * 1000;

export async function syncResultsFromApi(apiKey: string): Promise<SyncResult> {
  const fdMatches = await fetchWcMatches(apiKey);

  const teams = await db.select().from(schema.teams);
  const teamByCode = new Map(teams.map((t) => [t.code, t]));
  const ourMatches = await db.select().from(schema.matches);

  const result: SyncResult = {
    totalFromApi: fdMatches.length,
    finishedFromApi: 0,
    updated: 0,
    alreadyUpToDate: 0,
    unmatched: 0,
    unmatchedSamples: [],
  };

  for (const fdm of fdMatches) {
    if (fdm.status !== "FINISHED") continue;
    if (fdm.score.fullTime.home === null || fdm.score.fullTime.away === null) continue;
    result.finishedFromApi++;

    const homeCode = normalizeTla(fdm.homeTeam.tla);
    const awayCode = normalizeTla(fdm.awayTeam.tla);
    if (!homeCode || !awayCode) {
      result.unmatched++;
      addSample(result, fdm);
      continue;
    }

    const home = teamByCode.get(homeCode);
    const away = teamByCode.get(awayCode);
    if (!home || !away) {
      result.unmatched++;
      addSample(result, fdm);
      continue;
    }

    const fdTime = new Date(fdm.utcDate).getTime();
    const candidates = ourMatches.filter(
      (m) =>
        m.homeTeamId === home.id &&
        m.awayTeamId === away.id &&
        Math.abs(m.kickoff.getTime() - fdTime) < MATCH_WINDOW_MS,
    );

    if (candidates.length === 0) {
      result.unmatched++;
      addSample(result, fdm);
      continue;
    }
    // Closest in time wins if multiple candidates
    const match = candidates.sort(
      (a, b) =>
        Math.abs(a.kickoff.getTime() - fdTime) - Math.abs(b.kickoff.getTime() - fdTime),
    )[0];

    const newHome = fdm.score.fullTime.home;
    const newAway = fdm.score.fullTime.away;
    if (match.finished && match.homeGoals === newHome && match.awayGoals === newAway) {
      result.alreadyUpToDate++;
      continue;
    }

    await db
      .update(schema.matches)
      .set({ homeGoals: newHome, awayGoals: newAway, finished: true })
      .where(eq(schema.matches.id, match.id));
    await recalcMatchPredictions(match.id);
    result.updated++;
  }

  // Persist last sync time for visibility in the UI
  await db
    .insert(schema.settings)
    .values({ key: "last_sync_at", value: new Date().toISOString() })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: new Date().toISOString() },
    });

  return result;
}

function addSample(result: SyncResult, fdm: FdMatch) {
  if (result.unmatchedSamples.length < 5) {
    result.unmatchedSamples.push({
      home: fdm.homeTeam.tla,
      away: fdm.awayTeam.tla,
      utcDate: fdm.utcDate,
    });
  }
}
