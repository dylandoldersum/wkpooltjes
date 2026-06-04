// Client voor football-data.org v4 API.
// Docs: https://docs.football-data.org/general/v4/match.html

export type FdMatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

export type FdMatch = {
  id: number;
  utcDate: string;
  status: FdMatchStatus;
  stage: string;
  group: string | null;
  matchday: number | null;
  homeTeam: { id: number | null; name: string | null; tla: string | null };
  awayTeam: { id: number | null; name: string | null; tla: string | null };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
};

// Bekende TLA-verschillen tussen football-data.org en onze codes
// (lege map om mee te beginnen; aanvullen na eerste sync zodra we afwijkingen zien)
const TLA_ALIASES: Record<string, string> = {
  // football-data TLA -> onze code
  // Voorbeelden (verifieer na eerste sync):
  // KSA: "KSA",
  // RSA: "RSA",
};

export function normalizeTla(tla: string | null | undefined): string | null {
  if (!tla) return null;
  const upper = tla.toUpperCase();
  return TLA_ALIASES[upper] ?? upper;
}

export async function fetchWcMatches(apiKey: string): Promise<FdMatch[]> {
  const r = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`football-data ${r.status}: ${body.slice(0, 200)}`);
  }
  const j = (await r.json()) as { matches?: FdMatch[] };
  return j.matches ?? [];
}
