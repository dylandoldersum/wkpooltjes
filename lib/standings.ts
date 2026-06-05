import type { FdMatch } from "./football-data";
import type { Team } from "@/db/schema";
import { normalizeTla } from "./football-data";

export type TeamStanding = {
  teamId: number;
  groupCode: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

/**
 * Compute group standings from finished matches.
 * Tiebreakers: points → goal difference → goals for → team id (deterministic fallback).
 * Note: real FIFA tiebreakers include head-to-head and fair play; we approximate.
 */
export function computeGroupStandings(
  groupMatches: FdMatch[],
  teamByCode: Map<string, Team>,
  groupCode: string,
): TeamStanding[] {
  const standings = new Map<number, TeamStanding>();

  function ensure(team: Team): TeamStanding {
    if (!standings.has(team.id)) {
      standings.set(team.id, {
        teamId: team.id,
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
    return standings.get(team.id)!;
  }

  for (const m of groupMatches) {
    if (m.status !== "FINISHED") continue;
    const hg = m.score.fullTime.home;
    const ag = m.score.fullTime.away;
    if (hg === null || ag === null) continue;
    const homeCode = normalizeTla(m.homeTeam.tla);
    const awayCode = normalizeTla(m.awayTeam.tla);
    if (!homeCode || !awayCode) continue;
    const home = teamByCode.get(homeCode);
    const away = teamByCode.get(awayCode);
    if (!home || !away) continue;

    const hs = ensure(home);
    const as = ensure(away);

    hs.played++;
    as.played++;
    hs.goalsFor += hg;
    hs.goalsAgainst += ag;
    as.goalsFor += ag;
    as.goalsAgainst += hg;

    if (hg > ag) {
      hs.won++;
      hs.points += 3;
      as.lost++;
    } else if (hg < ag) {
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

  for (const s of standings.values()) {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
  }

  return Array.from(standings.values()).sort(compareStandings);
}

export function compareStandings(a: TeamStanding, b: TeamStanding): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return a.teamId - b.teamId;
}
