export const SCORING = {
  exactScore: 5, // exact uitslag (incl. toto)
  correctToto: 2, // alleen juiste winnaar / gelijk
  knockoutWinner: 1, // extra: juiste team door, bij gelijkspel
};

export function scoreForPrediction(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
): number {
  if (predHome === actualHome && predAway === actualAway) return SCORING.exactScore;
  const predRes = Math.sign(predHome - predAway);
  const actRes = Math.sign(actualHome - actualAway);
  if (predRes === actRes) return SCORING.correctToto;
  return 0;
}

export function totoLabel(home: number, away: number): "1" | "X" | "2" {
  if (home > away) return "1";
  if (home < away) return "2";
  return "X";
}
