import { db, schema } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { compareStandings, type TeamStanding } from "./standings";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

/**
 * Bereken voorspelde groepsstanden op basis van een user's wedstrijdvoorspellingen.
 * Returns een map groupCode → gesorteerde standings (1e, 2e, 3e, 4e).
 *
 * Alleen poules waarvan álle 6 wedstrijden voorspeld zijn krijgen een complete stand.
 */
export async function computePredictedStandings(
  userId: number,
): Promise<Map<string, TeamStanding[]>> {
  const rows = await db
    .select({
      matchId: schema.matches.id,
      groupCode: schema.matches.groupCode,
      homeTeamId: schema.matches.homeTeamId,
      awayTeamId: schema.matches.awayTeamId,
      homeGoals: schema.predictions.homeGoals,
      awayGoals: schema.predictions.awayGoals,
    })
    .from(schema.predictions)
    .innerJoin(schema.matches, eq(schema.predictions.matchId, schema.matches.id))
    .where(
      and(
        eq(schema.predictions.userId, userId),
        eq(schema.matches.stage, "group"),
      ),
    );

  const byGroup = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.groupCode || r.homeTeamId === null || r.awayTeamId === null) continue;
    if (!byGroup.has(r.groupCode)) byGroup.set(r.groupCode, []);
    byGroup.get(r.groupCode)!.push(r);
  }

  const result = new Map<string, TeamStanding[]>();
  for (const g of GROUPS) {
    const matches = byGroup.get(g) ?? [];
    if (matches.length < 6) continue; // poule heeft 6 wedstrijden (4 teams, ronde-robin)
    const standings = computeFromMatches(matches, g);
    if (standings.length === 4) result.set(g, standings);
  }
  return result;
}

function computeFromMatches(
  matches: Array<{
    homeTeamId: number | null;
    awayTeamId: number | null;
    homeGoals: number;
    awayGoals: number;
  }>,
  groupCode: string,
): TeamStanding[] {
  const standings = new Map<number, TeamStanding>();

  function ensure(teamId: number): TeamStanding {
    if (!standings.has(teamId)) {
      standings.set(teamId, {
        teamId,
        groupCode,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      });
    }
    return standings.get(teamId)!;
  }

  for (const m of matches) {
    if (m.homeTeamId === null || m.awayTeamId === null) continue;
    const hs = ensure(m.homeTeamId);
    const as = ensure(m.awayTeamId);

    hs.played++;
    as.played++;
    hs.goalsFor += m.homeGoals;
    hs.goalsAgainst += m.awayGoals;
    as.goalsFor += m.awayGoals;
    as.goalsAgainst += m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      hs.won++;
      hs.points += 3;
      as.lost++;
    } else if (m.homeGoals < m.awayGoals) {
      as.won++;
      as.points += 3;
      hs.lost++;
    } else {
      hs.drawn++;
      as.drawn++;
      hs.points += 1;
      as.points += 1;
    }
  }

  for (const s of standings.values()) s.goalDiff = s.goalsFor - s.goalsAgainst;
  return Array.from(standings.values()).sort(compareStandings);
}

/**
 * Bereken top 8 voorspelde 3e-plaatsen over alle 12 poules.
 * Returns null als niet alle poules complete standings hebben.
 */
export function computePredictedBestThirds(
  standingsByGroup: Map<string, TeamStanding[]>,
): TeamStanding[] | null {
  if (standingsByGroup.size < 12) return null;
  const thirds: TeamStanding[] = [];
  for (const s of standingsByGroup.values()) {
    if (s[2]) thirds.push(s[2]);
  }
  thirds.sort(compareStandings);
  return thirds.slice(0, 8);
}
