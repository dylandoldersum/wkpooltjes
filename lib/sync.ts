import { db, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { fetchWcMatches, normalizeTla, type FdMatch } from "./football-data";
import { recalcMatchPredictions, recalcBracketSlot } from "./recalc";
import { computeGroupStandings, compareStandings, type TeamStanding } from "./standings";

export type SyncResult = {
  totalFromApi: number;
  finishedFromApi: number;
  updated: number;
  alreadyUpToDate: number;
  unmatched: number;
  unmatchedSamples: Array<{ home: string | null; away: string | null; utcDate: string }>;
  bracketActualsSet: number;
  knockoutMatchesAdded: number;
};

const MATCH_WINDOW_MS = 48 * 60 * 60 * 1000;

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function mapApiStage(s: string): string | null {
  const n = s.toUpperCase();
  if (n === "GROUP_STAGE") return "group";
  if (n === "ROUND_OF_32" || n === "LAST_32") return "r32";
  if (n === "ROUND_OF_16" || n === "LAST_16") return "r16";
  if (n === "QUARTER_FINALS" || n === "LAST_8") return "qf";
  if (n === "SEMI_FINALS" || n === "LAST_4") return "sf";
  if (n === "THIRD_PLACE_FINAL" || n === "THIRD_PLACE") return "3rd";
  if (n === "FINAL") return "final";
  return null;
}

function parseApiGroup(g: string | null): string | null {
  if (!g) return null;
  // Format is typically "GROUP_A" — extract letter
  const m = g.toUpperCase().match(/GROUP_([A-Z])/);
  return m ? m[1] : null;
}

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
    bracketActualsSet: 0,
    knockoutMatchesAdded: 0,
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

  // ============ Knockout matches: voeg toe aan DB als ze er nog niet staan ============
  const knockoutAdded = await syncKnockoutMatches(fdMatches, teams);
  result.knockoutMatchesAdded = knockoutAdded;

  // ============ Bracket actuals: poulewinnaars + nr 2 + beste 3e + knockout ============
  const bracketActuals = await syncBracketActuals(fdMatches, teams);
  result.bracketActualsSet = bracketActuals;

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

/**
 * Voeg knockout matches uit de API toe aan onze matches tabel (als ze er nog niet staan).
 * Match op stage + team-paar. Update score als al aanwezig.
 */
async function syncKnockoutMatches(
  fdMatches: FdMatch[],
  teams: Array<typeof schema.teams.$inferSelect>,
): Promise<number> {
  const teamByCode = new Map(teams.map((t) => [t.code, t]));
  const allOurMatches = await db.select().from(schema.matches);

  let added = 0;
  for (const fdm of fdMatches) {
    const stage = mapApiStage(fdm.stage);
    if (!stage || stage === "group") continue;
    const homeCode = normalizeTla(fdm.homeTeam.tla);
    const awayCode = normalizeTla(fdm.awayTeam.tla);
    const homeTeam = homeCode ? teamByCode.get(homeCode) : null;
    const awayTeam = awayCode ? teamByCode.get(awayCode) : null;

    // Match in onze DB zoeken op stage + (team-paar OF kickoff binnen 48u OF beide)
    const fdTime = new Date(fdm.utcDate).getTime();
    const existing = allOurMatches.find(
      (m) =>
        m.stage === stage &&
        Math.abs(m.kickoff.getTime() - fdTime) < MATCH_WINDOW_MS &&
        ((homeTeam && m.homeTeamId === homeTeam.id) || !homeTeam) &&
        ((awayTeam && m.awayTeamId === awayTeam.id) || !awayTeam),
    );

    const hg = fdm.score.fullTime.home;
    const ag = fdm.score.fullTime.away;
    const finished = fdm.status === "FINISHED" && hg !== null && ag !== null;

    if (existing) {
      // Update als score/teams veranderd
      const needsUpdate =
        (homeTeam && existing.homeTeamId !== homeTeam.id) ||
        (awayTeam && existing.awayTeamId !== awayTeam.id) ||
        (finished && (existing.homeGoals !== hg || existing.awayGoals !== ag || !existing.finished));
      if (needsUpdate) {
        await db
          .update(schema.matches)
          .set({
            homeTeamId: homeTeam?.id ?? existing.homeTeamId,
            awayTeamId: awayTeam?.id ?? existing.awayTeamId,
            homeGoals: finished ? hg : existing.homeGoals,
            awayGoals: finished ? ag : existing.awayGoals,
            finished: finished || existing.finished,
            kickoff: new Date(fdm.utcDate),
          })
          .where(eq(schema.matches.id, existing.id));
      }
    } else {
      // Nieuwe knockout-match invoegen
      await db.insert(schema.matches).values({
        stage,
        groupCode: null,
        matchday: null,
        kickoff: new Date(fdm.utcDate),
        venue: "Onbekend (API)",
        homeTeamId: homeTeam?.id ?? null,
        awayTeamId: awayTeam?.id ?? null,
        homeLabel: homeTeam ? null : fdm.homeTeam.name,
        awayLabel: awayTeam ? null : fdm.awayTeam.name,
        homeGoals: finished ? hg : null,
        awayGoals: finished ? ag : null,
        finished,
      });
      added++;
    }
  }
  return added;
}

/**
 * Vul bracket-slot actuals automatisch:
 * - gw-X / gr-X uit groepsstanden
 * - bt-1..bt-8 uit beste 3e plaatsen (als alle 12 poules klaar zijn)
 * - r16/qf/sf/final slots uit knockout-winnaars
 */
async function syncBracketActuals(
  fdMatches: FdMatch[],
  teams: Array<typeof schema.teams.$inferSelect>,
): Promise<number> {
  const teamByCode = new Map(teams.map((t) => [t.code, t]));
  const allSlots = await db.select().from(schema.bracketSlots);
  const slotByKey = new Map(allSlots.map((s) => [s.slotKey, s]));

  let actualsSet = 0;

  // ---------- Groepsstanden ----------
  const finishedGroups: TeamStanding[][] = []; // standings per voltooide groep
  for (const g of GROUPS) {
    const groupMatches = fdMatches.filter(
      (m) => mapApiStage(m.stage) === "group" && parseApiGroup(m.group) === g,
    );
    // WK heeft 6 wedstrijden per groep (4 teams, ronde-robin)
    const finished = groupMatches.filter((m) => m.status === "FINISHED");
    if (groupMatches.length < 6 || finished.length < 6) continue;

    const standings = computeGroupStandings(finished, teamByCode, g);
    if (standings.length < 4) continue; // niet alle teams gevonden

    finishedGroups.push(standings);

    // gw-X: winnaar
    const winnerSlot = slotByKey.get(`gw-${g}`);
    if (winnerSlot && winnerSlot.actualTeamId !== standings[0].teamId) {
      await db
        .update(schema.bracketSlots)
        .set({ actualTeamId: standings[0].teamId })
        .where(eq(schema.bracketSlots.id, winnerSlot.id));
      await recalcBracketSlot(winnerSlot.id);
      actualsSet++;
    }

    // gr-X: nummer 2
    const runnerSlot = slotByKey.get(`gr-${g}`);
    if (runnerSlot && runnerSlot.actualTeamId !== standings[1].teamId) {
      await db
        .update(schema.bracketSlots)
        .set({ actualTeamId: standings[1].teamId })
        .where(eq(schema.bracketSlots.id, runnerSlot.id));
      await recalcBracketSlot(runnerSlot.id);
      actualsSet++;
    }
  }

  // ---------- Beste 3e plaatsen ----------
  if (finishedGroups.length === GROUPS.length) {
    const thirds = finishedGroups
      .map((s) => s[2])
      .filter(Boolean)
      .sort(compareStandings);
    const best8 = thirds.slice(0, 8);

    for (let i = 0; i < best8.length; i++) {
      const slot = slotByKey.get(`bt-${i + 1}`);
      if (slot && slot.actualTeamId !== best8[i].teamId) {
        await db
          .update(schema.bracketSlots)
          .set({ actualTeamId: best8[i].teamId })
          .where(eq(schema.bracketSlots.id, slot.id));
        await recalcBracketSlot(slot.id);
        actualsSet++;
      }
    }
  }

  // ---------- Knockout: r16, qf, sf, final actuals uit winnaars ----------
  // r16 slots = winnaars van r32 matches
  // qf slots = winnaars van r16 matches
  // sf slots = winnaars van qf matches
  // final slots = winnaars van sf matches
  const knockoutMap: Array<{ apiStage: string; slotStage: string; expectedCount: number }> = [
    { apiStage: "r32", slotStage: "r16", expectedCount: 16 },
    { apiStage: "r16", slotStage: "qf", expectedCount: 8 },
    { apiStage: "qf", slotStage: "sf", expectedCount: 4 },
    { apiStage: "sf", slotStage: "final", expectedCount: 2 },
  ];

  for (const { apiStage, slotStage, expectedCount } of knockoutMap) {
    const stageMatches = fdMatches.filter((m) => mapApiStage(m.stage) === apiStage);
    if (stageMatches.length < expectedCount) continue;
    const allFinished = stageMatches.every((m) => m.status === "FINISHED");
    if (!allFinished) continue;

    // Verzamel winnaars
    const winners: number[] = [];
    for (const fdm of stageMatches) {
      const w = fdm.score.winner;
      const tla =
        w === "HOME_TEAM" ? fdm.homeTeam.tla : w === "AWAY_TEAM" ? fdm.awayTeam.tla : null;
      const code = normalizeTla(tla);
      if (!code) continue;
      const team = teamByCode.get(code);
      if (!team) continue;
      winners.push(team.id);
    }

    const slots = allSlots
      .filter((s) => s.stage === slotStage)
      .sort((a, b) => a.id - b.id);

    for (let i = 0; i < slots.length && i < winners.length; i++) {
      if (slots[i].actualTeamId !== winners[i]) {
        await db
          .update(schema.bracketSlots)
          .set({ actualTeamId: winners[i] })
          .where(eq(schema.bracketSlots.id, slots[i].id));
        await recalcBracketSlot(slots[i].id);
        actualsSet++;
      }
    }
  }

  return actualsSet;
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
