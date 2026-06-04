// Env vars worden geladen via `node --env-file=.env.local` (zie package.json scripts)
import { db, schema } from "../db/client";
import { eq } from "drizzle-orm";

// All 48 teams grouped A..L
const TEAMS: Array<{ code: string; name: string; flag: string; group: string }> = [
  // Group A
  { code: "MEX", name: "Mexico", flag: "🇲🇽", group: "A" },
  { code: "RSA", name: "Zuid-Afrika", flag: "🇿🇦", group: "A" },
  { code: "KOR", name: "Zuid-Korea", flag: "🇰🇷", group: "A" },
  { code: "CZE", name: "Tsjechië", flag: "🇨🇿", group: "A" },
  // Group B
  { code: "CAN", name: "Canada", flag: "🇨🇦", group: "B" },
  { code: "BIH", name: "Bosnië-Herzegovina", flag: "🇧🇦", group: "B" },
  { code: "QAT", name: "Qatar", flag: "🇶🇦", group: "B" },
  { code: "SUI", name: "Zwitserland", flag: "🇨🇭", group: "B" },
  // Group C
  { code: "BRA", name: "Brazilië", flag: "🇧🇷", group: "C" },
  { code: "MAR", name: "Marokko", flag: "🇲🇦", group: "C" },
  { code: "HAI", name: "Haïti", flag: "🇭🇹", group: "C" },
  { code: "SCO", name: "Schotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", group: "C" },
  // Group D
  { code: "USA", name: "Verenigde Staten", flag: "🇺🇸", group: "D" },
  { code: "PAR", name: "Paraguay", flag: "🇵🇾", group: "D" },
  { code: "AUS", name: "Australië", flag: "🇦🇺", group: "D" },
  { code: "TUR", name: "Turkije", flag: "🇹🇷", group: "D" },
  // Group E
  { code: "GER", name: "Duitsland", flag: "🇩🇪", group: "E" },
  { code: "CUW", name: "Curaçao", flag: "🇨🇼", group: "E" },
  { code: "CIV", name: "Ivoorkust", flag: "🇨🇮", group: "E" },
  { code: "ECU", name: "Ecuador", flag: "🇪🇨", group: "E" },
  // Group F
  { code: "NED", name: "Nederland", flag: "🇳🇱", group: "F" },
  { code: "JPN", name: "Japan", flag: "🇯🇵", group: "F" },
  { code: "SWE", name: "Zweden", flag: "🇸🇪", group: "F" },
  { code: "TUN", name: "Tunesië", flag: "🇹🇳", group: "F" },
  // Group G
  { code: "BEL", name: "België", flag: "🇧🇪", group: "G" },
  { code: "EGY", name: "Egypte", flag: "🇪🇬", group: "G" },
  { code: "IRN", name: "Iran", flag: "🇮🇷", group: "G" },
  { code: "NZL", name: "Nieuw-Zeeland", flag: "🇳🇿", group: "G" },
  // Group H
  { code: "ESP", name: "Spanje", flag: "🇪🇸", group: "H" },
  { code: "CPV", name: "Kaapverdië", flag: "🇨🇻", group: "H" },
  { code: "KSA", name: "Saoedi-Arabië", flag: "🇸🇦", group: "H" },
  { code: "URU", name: "Uruguay", flag: "🇺🇾", group: "H" },
  // Group I
  { code: "FRA", name: "Frankrijk", flag: "🇫🇷", group: "I" },
  { code: "SEN", name: "Senegal", flag: "🇸🇳", group: "I" },
  { code: "IRQ", name: "Irak", flag: "🇮🇶", group: "I" },
  { code: "NOR", name: "Noorwegen", flag: "🇳🇴", group: "I" },
  // Group J
  { code: "ARG", name: "Argentinië", flag: "🇦🇷", group: "J" },
  { code: "ALG", name: "Algerije", flag: "🇩🇿", group: "J" },
  { code: "AUT", name: "Oostenrijk", flag: "🇦🇹", group: "J" },
  { code: "JOR", name: "Jordanië", flag: "🇯🇴", group: "J" },
  // Group K
  { code: "POR", name: "Portugal", flag: "🇵🇹", group: "K" },
  { code: "COD", name: "DR Congo", flag: "🇨🇩", group: "K" },
  { code: "UZB", name: "Oezbekistan", flag: "🇺🇿", group: "K" },
  { code: "COL", name: "Colombia", flag: "🇨🇴", group: "K" },
  // Group L
  { code: "ENG", name: "Engeland", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", group: "L" },
  { code: "CRO", name: "Kroatië", flag: "🇭🇷", group: "L" },
  { code: "GHA", name: "Ghana", flag: "🇬🇭", group: "L" },
  { code: "PAN", name: "Panama", flag: "🇵🇦", group: "L" },
];

// Group stage matches. Times default to 18:00 UTC (~20:00 NL). Admin can edit per match.
// Each entry: [home_code, away_code, date_iso_local_amsterdam_assumption, venue]
type MatchSeed = { home: string; away: string; date: string; venue: string; group: string; matchday: number };

const M: MatchSeed[] = [
  // Matchday 1 (Jun 11–17, 2026)
  { home: "MEX", away: "RSA", date: "2026-06-11T20:00:00+02:00", venue: "Estadio Azteca, Mexico-Stad", group: "A", matchday: 1 },
  { home: "KOR", away: "CZE", date: "2026-06-11T22:00:00+02:00", venue: "Estadio Akron, Guadalajara", group: "A", matchday: 1 },
  { home: "CAN", away: "BIH", date: "2026-06-12T20:00:00+02:00", venue: "BMO Field, Toronto", group: "B", matchday: 1 },
  { home: "QAT", away: "SUI", date: "2026-06-12T22:00:00+02:00", venue: "Levi's Stadium, Santa Clara", group: "B", matchday: 1 },
  { home: "USA", away: "PAR", date: "2026-06-12T00:00:00+02:00", venue: "SoFi Stadium, Inglewood", group: "D", matchday: 1 },
  { home: "AUS", away: "TUR", date: "2026-06-12T02:00:00+02:00", venue: "BC Place, Vancouver", group: "D", matchday: 1 },
  { home: "BRA", away: "MAR", date: "2026-06-13T20:00:00+02:00", venue: "Gillette Stadium, Foxborough", group: "C", matchday: 1 },
  { home: "HAI", away: "SCO", date: "2026-06-13T22:00:00+02:00", venue: "MetLife Stadium, East Rutherford", group: "C", matchday: 1 },
  { home: "GER", away: "CUW", date: "2026-06-14T18:00:00+02:00", venue: "Lincoln Financial Field, Philadelphia", group: "E", matchday: 1 },
  { home: "CIV", away: "ECU", date: "2026-06-14T20:00:00+02:00", venue: "NRG Stadium, Houston", group: "E", matchday: 1 },
  { home: "NED", away: "JPN", date: "2026-06-14T22:00:00+02:00", venue: "AT&T Stadium, Arlington", group: "F", matchday: 1 },
  { home: "SWE", away: "TUN", date: "2026-06-15T00:00:00+02:00", venue: "Estadio BBVA, Monterrey", group: "F", matchday: 1 },
  { home: "BEL", away: "EGY", date: "2026-06-15T18:00:00+02:00", venue: "SoFi Stadium, Inglewood", group: "G", matchday: 1 },
  { home: "IRN", away: "NZL", date: "2026-06-15T20:00:00+02:00", venue: "Lumen Field, Seattle", group: "G", matchday: 1 },
  { home: "ESP", away: "CPV", date: "2026-06-15T22:00:00+02:00", venue: "Hard Rock Stadium, Miami Gardens", group: "H", matchday: 1 },
  { home: "KSA", away: "URU", date: "2026-06-16T00:00:00+02:00", venue: "Mercedes-Benz Stadium, Atlanta", group: "H", matchday: 1 },
  { home: "FRA", away: "SEN", date: "2026-06-16T18:00:00+02:00", venue: "MetLife Stadium, East Rutherford", group: "I", matchday: 1 },
  { home: "IRQ", away: "NOR", date: "2026-06-16T20:00:00+02:00", venue: "Gillette Stadium, Foxborough", group: "I", matchday: 1 },
  { home: "ARG", away: "ALG", date: "2026-06-16T22:00:00+02:00", venue: "Arrowhead Stadium, Kansas City", group: "J", matchday: 1 },
  { home: "AUT", away: "JOR", date: "2026-06-17T00:00:00+02:00", venue: "Levi's Stadium, Santa Clara", group: "J", matchday: 1 },
  { home: "POR", away: "COD", date: "2026-06-17T18:00:00+02:00", venue: "NRG Stadium, Houston", group: "K", matchday: 1 },
  { home: "UZB", away: "COL", date: "2026-06-17T20:00:00+02:00", venue: "Estadio Azteca, Mexico-Stad", group: "K", matchday: 1 },
  { home: "ENG", away: "CRO", date: "2026-06-17T22:00:00+02:00", venue: "BMO Field, Toronto", group: "L", matchday: 1 },
  { home: "GHA", away: "PAN", date: "2026-06-18T00:00:00+02:00", venue: "AT&T Stadium, Arlington", group: "L", matchday: 1 },

  // Matchday 2 (Jun 18–23)
  { home: "CZE", away: "RSA", date: "2026-06-18T18:00:00+02:00", venue: "Mercedes-Benz Stadium, Atlanta", group: "A", matchday: 2 },
  { home: "MEX", away: "KOR", date: "2026-06-18T20:00:00+02:00", venue: "Estadio Akron, Guadalajara", group: "A", matchday: 2 },
  { home: "SUI", away: "BIH", date: "2026-06-18T22:00:00+02:00", venue: "SoFi Stadium, Inglewood", group: "B", matchday: 2 },
  { home: "CAN", away: "QAT", date: "2026-06-19T00:00:00+02:00", venue: "BC Place, Vancouver", group: "B", matchday: 2 },
  { home: "BRA", away: "HAI", date: "2026-06-19T18:00:00+02:00", venue: "Lincoln Financial Field, Philadelphia", group: "C", matchday: 2 },
  { home: "SCO", away: "MAR", date: "2026-06-19T20:00:00+02:00", venue: "Gillette Stadium, Foxborough", group: "C", matchday: 2 },
  { home: "TUR", away: "PAR", date: "2026-06-19T22:00:00+02:00", venue: "Levi's Stadium, Santa Clara", group: "D", matchday: 2 },
  { home: "USA", away: "AUS", date: "2026-06-20T00:00:00+02:00", venue: "Lumen Field, Seattle", group: "D", matchday: 2 },
  { home: "GER", away: "CIV", date: "2026-06-20T18:00:00+02:00", venue: "BMO Field, Toronto", group: "E", matchday: 2 },
  { home: "ECU", away: "CUW", date: "2026-06-20T20:00:00+02:00", venue: "Arrowhead Stadium, Kansas City", group: "E", matchday: 2 },
  { home: "NED", away: "SWE", date: "2026-06-20T22:00:00+02:00", venue: "NRG Stadium, Houston", group: "F", matchday: 2 },
  { home: "TUN", away: "JPN", date: "2026-06-21T00:00:00+02:00", venue: "Estadio BBVA, Monterrey", group: "F", matchday: 2 },
  { home: "BEL", away: "IRN", date: "2026-06-21T18:00:00+02:00", venue: "SoFi Stadium, Inglewood", group: "G", matchday: 2 },
  { home: "NZL", away: "EGY", date: "2026-06-21T20:00:00+02:00", venue: "BC Place, Vancouver", group: "G", matchday: 2 },
  { home: "ESP", away: "KSA", date: "2026-06-21T22:00:00+02:00", venue: "Hard Rock Stadium, Miami Gardens", group: "H", matchday: 2 },
  { home: "URU", away: "CPV", date: "2026-06-22T00:00:00+02:00", venue: "Mercedes-Benz Stadium, Atlanta", group: "H", matchday: 2 },
  { home: "FRA", away: "IRQ", date: "2026-06-22T18:00:00+02:00", venue: "MetLife Stadium, East Rutherford", group: "I", matchday: 2 },
  { home: "NOR", away: "SEN", date: "2026-06-22T20:00:00+02:00", venue: "Lincoln Financial Field, Philadelphia", group: "I", matchday: 2 },
  { home: "ARG", away: "AUT", date: "2026-06-22T22:00:00+02:00", venue: "AT&T Stadium, Arlington", group: "J", matchday: 2 },
  { home: "JOR", away: "ALG", date: "2026-06-23T00:00:00+02:00", venue: "Levi's Stadium, Santa Clara", group: "J", matchday: 2 },
  { home: "POR", away: "UZB", date: "2026-06-23T18:00:00+02:00", venue: "NRG Stadium, Houston", group: "K", matchday: 2 },
  { home: "COL", away: "COD", date: "2026-06-23T20:00:00+02:00", venue: "Estadio Akron, Guadalajara", group: "K", matchday: 2 },
  { home: "ENG", away: "GHA", date: "2026-06-23T22:00:00+02:00", venue: "Gillette Stadium, Foxborough", group: "L", matchday: 2 },
  { home: "PAN", away: "CRO", date: "2026-06-24T00:00:00+02:00", venue: "BMO Field, Toronto", group: "L", matchday: 2 },

  // Matchday 3 (Jun 24–27) — two simultaneous matches per group
  { home: "CZE", away: "MEX", date: "2026-06-24T20:00:00+02:00", venue: "Estadio Azteca, Mexico-Stad", group: "A", matchday: 3 },
  { home: "RSA", away: "KOR", date: "2026-06-24T20:00:00+02:00", venue: "Estadio BBVA, Monterrey", group: "A", matchday: 3 },
  { home: "SUI", away: "CAN", date: "2026-06-24T22:00:00+02:00", venue: "BC Place, Vancouver", group: "B", matchday: 3 },
  { home: "BIH", away: "QAT", date: "2026-06-24T22:00:00+02:00", venue: "Lumen Field, Seattle", group: "B", matchday: 3 },
  { home: "SCO", away: "BRA", date: "2026-06-25T02:00:00+02:00", venue: "Hard Rock Stadium, Miami Gardens", group: "C", matchday: 3 },
  { home: "MAR", away: "HAI", date: "2026-06-25T02:00:00+02:00", venue: "Mercedes-Benz Stadium, Atlanta", group: "C", matchday: 3 },
  { home: "TUR", away: "USA", date: "2026-06-25T22:00:00+02:00", venue: "SoFi Stadium, Inglewood", group: "D", matchday: 3 },
  { home: "PAR", away: "AUS", date: "2026-06-25T22:00:00+02:00", venue: "Levi's Stadium, Santa Clara", group: "D", matchday: 3 },
  { home: "ECU", away: "GER", date: "2026-06-26T02:00:00+02:00", venue: "Lincoln Financial Field, Philadelphia", group: "E", matchday: 3 },
  { home: "CUW", away: "CIV", date: "2026-06-26T02:00:00+02:00", venue: "MetLife Stadium, East Rutherford", group: "E", matchday: 3 },
  { home: "TUN", away: "NED", date: "2026-06-25T22:00:00+02:00", venue: "AT&T Stadium, Arlington", group: "F", matchday: 3 },
  { home: "JPN", away: "SWE", date: "2026-06-25T22:00:00+02:00", venue: "Arrowhead Stadium, Kansas City", group: "F", matchday: 3 },
  { home: "NZL", away: "BEL", date: "2026-06-26T22:00:00+02:00", venue: "Lumen Field, Seattle", group: "G", matchday: 3 },
  { home: "EGY", away: "IRN", date: "2026-06-26T22:00:00+02:00", venue: "BC Place, Vancouver", group: "G", matchday: 3 },
  { home: "URU", away: "ESP", date: "2026-06-27T02:00:00+02:00", venue: "NRG Stadium, Houston", group: "H", matchday: 3 },
  { home: "CPV", away: "KSA", date: "2026-06-27T02:00:00+02:00", venue: "Estadio Akron, Guadalajara", group: "H", matchday: 3 },
  { home: "NOR", away: "FRA", date: "2026-06-26T22:00:00+02:00", venue: "Gillette Stadium, Foxborough", group: "I", matchday: 3 },
  { home: "SEN", away: "IRQ", date: "2026-06-26T22:00:00+02:00", venue: "BMO Field, Toronto", group: "I", matchday: 3 },
  { home: "JOR", away: "ARG", date: "2026-06-27T22:00:00+02:00", venue: "Arrowhead Stadium, Kansas City", group: "J", matchday: 3 },
  { home: "ALG", away: "AUT", date: "2026-06-27T22:00:00+02:00", venue: "AT&T Stadium, Arlington", group: "J", matchday: 3 },
  { home: "COL", away: "POR", date: "2026-06-28T02:00:00+02:00", venue: "Hard Rock Stadium, Miami Gardens", group: "K", matchday: 3 },
  { home: "COD", away: "UZB", date: "2026-06-28T02:00:00+02:00", venue: "Mercedes-Benz Stadium, Atlanta", group: "K", matchday: 3 },
  { home: "PAN", away: "ENG", date: "2026-06-27T22:00:00+02:00", venue: "MetLife Stadium, East Rutherford", group: "L", matchday: 3 },
  { home: "CRO", away: "GHA", date: "2026-06-27T22:00:00+02:00", venue: "Lincoln Financial Field, Philadelphia", group: "L", matchday: 3 },
];

// Bonus questions
const BONUS_QUESTIONS = [
  { question: "Wie wordt wereldkampioen?", type: "team" as const, points: 25, locksAtIso: "2026-06-11T20:00:00+02:00" },
  { question: "Wie wordt verliezend finalist?", type: "team" as const, points: 15, locksAtIso: "2026-06-11T20:00:00+02:00" },
  { question: "Wie wordt nummer 3?", type: "team" as const, points: 10, locksAtIso: "2026-06-11T20:00:00+02:00" },
  { question: "Wie wordt topscorer? (achternaam)", type: "text" as const, points: 15, locksAtIso: "2026-06-11T20:00:00+02:00" },
  { question: "Hoeveel doelpunten maakt Oranje in totaal op het WK?", type: "number" as const, points: 10, locksAtIso: "2026-06-14T22:00:00+02:00" },
  { question: "Tot welke ronde komt Oranje?", type: "text" as const, points: 10, locksAtIso: "2026-06-14T22:00:00+02:00" },
];

// Bracket slots — WK 2026 format: 12 groepen → top 2 + 8 beste 3e = 32 teams in R32 → 16 → 8 → 4 → 2.
const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const BRACKET_SLOTS = [
  // 12 poulewinnaars (slot-specifiek: gw-A == Brazilië scoort alleen als Brazilië echt poule A wint)
  ...GROUPS.map((g) => ({
    slotKey: `gw-${g}`,
    stage: "group-winner" as const,
    label: `Winnaar poule ${g}`,
    points: 3,
  })),
  // 12 nummer 2's per poule
  ...GROUPS.map((g) => ({
    slotKey: `gr-${g}`,
    stage: "group-runner-up" as const,
    label: `Tweede poule ${g}`,
    points: 2,
  })),
  // 8 beste 3e plaatsen (interchangeable — pick any 8 teams)
  ...Array.from({ length: 8 }, (_, i) => ({
    slotKey: `bt-${i + 1}`,
    stage: "best-third" as const,
    label: `Beste 3e #${i + 1}`,
    points: 2,
  })),
  // Round of 16 (top 16 winners of R32 — predict which 16 teams reach the R16)
  ...Array.from({ length: 16 }, (_, i) => ({
    slotKey: `r16-${i + 1}`,
    stage: "r16" as const,
    label: `Achtste finalist #${i + 1}`,
    points: 3,
  })),
  // Quarter finals
  ...Array.from({ length: 8 }, (_, i) => ({
    slotKey: `qf-${i + 1}`,
    stage: "qf" as const,
    label: `Kwartfinalist #${i + 1}`,
    points: 5,
  })),
  // Semi finals
  ...Array.from({ length: 4 }, (_, i) => ({
    slotKey: `sf-${i + 1}`,
    stage: "sf" as const,
    label: `Halvefinalist #${i + 1}`,
    points: 8,
  })),
  // Final
  ...Array.from({ length: 2 }, (_, i) => ({
    slotKey: `final-${i + 1}`,
    stage: "final" as const,
    label: `Finalist #${i + 1}`,
    points: 12,
  })),
];

async function main() {
  console.log("Seeding teams...");
  for (const t of TEAMS) {
    const existing = await db.select().from(schema.teams).where(eq(schema.teams.code, t.code));
    if (existing.length === 0) {
      await db.insert(schema.teams).values({
        code: t.code,
        name: t.name,
        flag: t.flag,
        groupCode: t.group,
      });
    } else {
      await db
        .update(schema.teams)
        .set({ name: t.name, flag: t.flag, groupCode: t.group })
        .where(eq(schema.teams.code, t.code));
    }
  }
  console.log(`✓ ${TEAMS.length} teams`);

  console.log("Seeding matches...");
  const allTeams = await db.select().from(schema.teams);
  const idByCode = new Map(allTeams.map((t) => [t.code, t.id] as const));

  // Wipe existing group matches to keep idempotency simple — re-create them.
  // We only do this for stage='group' so manual knockout edits aren't blown away.
  await db.delete(schema.matches).where(eq(schema.matches.stage, "group"));

  for (const m of M) {
    const homeId = idByCode.get(m.home);
    const awayId = idByCode.get(m.away);
    if (!homeId || !awayId) {
      console.warn(`Skip match ${m.home} vs ${m.away}: unknown team code`);
      continue;
    }
    await db.insert(schema.matches).values({
      stage: "group",
      groupCode: m.group,
      matchday: m.matchday,
      kickoff: new Date(m.date),
      venue: m.venue,
      homeTeamId: homeId,
      awayTeamId: awayId,
    });
  }
  console.log(`✓ ${M.length} group matches`);

  console.log("Seeding bonus questions...");
  for (const [i, q] of BONUS_QUESTIONS.entries()) {
    const existing = await db.select().from(schema.bonusQuestions).where(eq(schema.bonusQuestions.question, q.question));
    if (existing.length === 0) {
      await db.insert(schema.bonusQuestions).values({
        question: q.question,
        type: q.type,
        points: q.points,
        locksAt: new Date(q.locksAtIso),
        sortOrder: i,
      });
    }
  }
  console.log(`✓ ${BONUS_QUESTIONS.length} bonus questions`);

  console.log("Seeding bracket slots...");
  for (const s of BRACKET_SLOTS) {
    const existing = await db.select().from(schema.bracketSlots).where(eq(schema.bracketSlots.slotKey, s.slotKey));
    if (existing.length === 0) {
      await db.insert(schema.bracketSlots).values({
        slotKey: s.slotKey,
        stage: s.stage,
        label: s.label,
        points: s.points,
      });
    }
  }
  console.log(`✓ ${BRACKET_SLOTS.length} bracket slots`);

  // Settings: tournament lock time (first match kickoff)
  const firstKickoffIso = "2026-06-11T20:00:00+02:00";
  await db
    .insert(schema.settings)
    .values({ key: "tournament_locks_at", value: firstKickoffIso })
    .onConflictDoUpdate({
      target: schema.settings.key,
      set: { value: firstKickoffIso },
    });
  console.log(`✓ tournament_locks_at = ${firstKickoffIso}`);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
