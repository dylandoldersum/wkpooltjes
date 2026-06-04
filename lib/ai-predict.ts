import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { db, schema } from "@/db/client";
import { eq, gt } from "drizzle-orm";

// Volgorde van fallback-models. Bij overload op de eerste, probeer de volgende.
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY ontbreekt in env");
  return new GoogleGenAI({ apiKey });
}

function isRetryableError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message.toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("resource_exhausted") ||
    msg.includes("internal") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("504")
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGeminiJson<T>(
  prompt: string,
  responseSchema: object,
  zodSchema: z.ZodType<T>,
): Promise<T> {
  const ai = getClient();
  let lastError: unknown = null;

  // Loop door modellen. Per model: 3 retries met exponential backoff.
  for (let modelIdx = 0; modelIdx < MODELS.length; modelIdx++) {
    const model = MODELS[modelIdx];
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema,
            temperature: 0.4,
          },
        });
        const text = response.text;
        if (!text) throw new Error("Gemini gaf geen tekst-respons");
        const json = JSON.parse(text);
        return zodSchema.parse(json);
      } catch (e) {
        lastError = e;
        if (!isRetryableError(e)) throw e;
        // Wacht 1s, 2s, 4s tussen pogingen
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `[ai-predict] ${model} attempt ${attempt + 1} failed (${
            e instanceof Error ? e.message.slice(0, 80) : "unknown"
          }), retrying in ${delay}ms`,
        );
        await sleep(delay);
      }
    }
    console.warn(`[ai-predict] ${model} exhausted, trying next model`);
  }

  throw lastError instanceof Error
    ? new Error(
        `Alle Gemini-modellen overbelast. Probeer over een paar minuten opnieuw. (laatste: ${lastError.message})`,
      )
    : new Error("Alle Gemini-modellen faalden");
}

/* --------------------------- Match predictions --------------------------- */

const MatchPredictionSchema = z.object({
  predictions: z.array(
    z.object({
      matchId: z.number().int().positive(),
      homeGoals: z.number().int().min(0).max(7),
      awayGoals: z.number().int().min(0).max(7),
    }),
  ),
});

export async function predictMatchesForUser(userId: number): Promise<{
  predicted: number;
  skipped: number;
}> {
  const now = new Date();
  const matches = await db.select().from(schema.matches);
  const teams = await db.select().from(schema.teams);
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const existing = await db
    .select()
    .from(schema.predictions)
    .where(eq(schema.predictions.userId, userId));
  const filledIds = new Set(existing.map((e) => e.matchId));

  const candidates = matches.filter(
    (m) =>
      m.kickoff.getTime() > now.getTime() &&
      m.homeTeamId !== null &&
      m.awayTeamId !== null &&
      !filledIds.has(m.id),
  );

  if (candidates.length === 0) return { predicted: 0, skipped: matches.length };

  const matchList = candidates.map((m) => {
    const home = teamById.get(m.homeTeamId!)!;
    const away = teamById.get(m.awayTeamId!)!;
    return `- matchId ${m.id} | poule ${m.groupCode} | ${home.name} vs ${away.name}`;
  });

  const prompt = `Voorspel het eindresultaat (na 90 minuten / reguliere speeltijd) voor elke wedstrijd van het FIFA WK 2026.

Wedstrijden:
${matchList.join("\n")}

Richtlijnen:
- Geef per wedstrijd een realistische score op basis van teamkwaliteit en recente vorm tot mei 2026.
- Vermijd onrealistische blow-outs (>4-0) tenzij het écht voor de hand ligt.
- Score per team max 5 in normale gevallen.
- Houd rekening met groepsfase-dynamiek: vaak voorzichtige scores (1-0, 1-1, 2-1).
- Geef ALLE wedstrijden uit de lijst hierboven terug, met de juiste matchId.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      predictions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            matchId: { type: Type.INTEGER },
            homeGoals: { type: Type.INTEGER, minimum: 0, maximum: 7 },
            awayGoals: { type: Type.INTEGER, minimum: 0, maximum: 7 },
          },
          required: ["matchId", "homeGoals", "awayGoals"],
          propertyOrdering: ["matchId", "homeGoals", "awayGoals"],
        },
      },
    },
    required: ["predictions"],
    propertyOrdering: ["predictions"],
  };

  const parsed = await callGeminiJson(prompt, responseSchema, MatchPredictionSchema);

  const candidateIds = new Set(candidates.map((c) => c.id));
  let predicted = 0;
  for (const p of parsed.predictions) {
    if (!candidateIds.has(p.matchId)) continue;
    await db.insert(schema.predictions).values({
      userId,
      matchId: p.matchId,
      homeGoals: p.homeGoals,
      awayGoals: p.awayGoals,
      updatedAt: new Date(),
    });
    predicted++;
  }
  return { predicted, skipped: candidates.length - predicted };
}

/* --------------------------- Bonus predictions --------------------------- */

const BonusPredictionSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.number().int().positive(),
      answer: z.string().min(1),
    }),
  ),
});

export async function predictBonusForUser(userId: number): Promise<{
  predicted: number;
  skipped: number;
}> {
  const now = new Date();
  const questions = await db
    .select()
    .from(schema.bonusQuestions)
    .where(gt(schema.bonusQuestions.locksAt, now));
  if (questions.length === 0) return { predicted: 0, skipped: 0 };

  const existing = await db
    .select()
    .from(schema.bonusAnswers)
    .where(eq(schema.bonusAnswers.userId, userId));
  const filled = new Set(existing.map((a) => a.questionId));
  const open = questions.filter((q) => !filled.has(q.id));
  if (open.length === 0) return { predicted: 0, skipped: questions.length };

  const teams = await db.select().from(schema.teams);
  const teamList = teams.map((t) => `${t.id}: ${t.name}`).join("\n");

  const questionList = open
    .map((q) => `- id ${q.id} | type=${q.type} | "${q.question}"`)
    .join("\n");

  const prompt = `Voorspel de antwoorden op deze bonusvragen voor het FIFA WK 2026.

Beschikbare teams (formaat "id: naam"):
${teamList}

Vragen:
${questionList}

Regels per type:
- type=team: antwoord moet exact het team ID zijn (een getal uit de lijst hierboven, als string).
- type=number: antwoord is een geheel getal (als string).
- type=text: korte vrije tekst (bijv. achternaam topscorer, of "kwartfinale").

Geef per vraag het meest realistische antwoord. Voor de Oranje-specifieke vragen: gemiddelde verwachting, geen extreme uitkomsten.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      answers: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionId: { type: Type.INTEGER },
            answer: { type: Type.STRING },
          },
          required: ["questionId", "answer"],
          propertyOrdering: ["questionId", "answer"],
        },
      },
    },
    required: ["answers"],
    propertyOrdering: ["answers"],
  };

  const parsed = await callGeminiJson(prompt, responseSchema, BonusPredictionSchema);

  const openIds = new Set(open.map((q) => q.id));
  let predicted = 0;
  for (const a of parsed.answers) {
    if (!openIds.has(a.questionId)) continue;
    await db.insert(schema.bonusAnswers).values({
      userId,
      questionId: a.questionId,
      answer: a.answer.trim().slice(0, 120),
      updatedAt: new Date(),
    });
    predicted++;
  }
  return { predicted, skipped: open.length - predicted };
}

/* --------------------------- Bracket predictions --------------------------- */

const BracketPredictionSchema = z.object({
  picks: z.array(
    z.object({
      slotId: z.number().int().positive(),
      teamId: z.number().int().positive(),
    }),
  ),
});

export async function predictBracketForUser(userId: number): Promise<{
  predicted: number;
  skipped: number;
}> {
  const slots = await db.select().from(schema.bracketSlots);
  if (slots.length === 0) return { predicted: 0, skipped: 0 };

  const existing = await db
    .select()
    .from(schema.bracketPredictions)
    .where(eq(schema.bracketPredictions.userId, userId));
  const filled = new Set(existing.map((p) => p.slotId));
  const open = slots.filter((s) => !filled.has(s.id));
  if (open.length === 0) return { predicted: 0, skipped: slots.length };

  const teams = await db.select().from(schema.teams);
  const teamList = teams
    .map((t) => `${t.id}: ${t.name} (poule ${t.groupCode})`)
    .join("\n");

  const slotList = open
    .map((s) => `- slotId ${s.id} | ronde=${s.stage} | "${s.label}"`)
    .join("\n");

  const prompt = `Voorspel welke teams welke posities/rondes halen op het WK 2026.

Beschikbare teams (formaat "id: naam (poule)"):
${teamList}

Slots om te vullen (elk slot = één team):
${slotList}

Stages uitgelegd:
- "group-winner" — voorspel poulewinnaar per poule (slot "Winnaar poule A" = team dat poule A wint, etc.).
  KRITIEK: kies een team UIT die specifieke poule. "Winnaar poule A" mag alleen een team uit poule A zijn.
- "group-runner-up" — nummer 2 per poule. Idem: kies team UIT die poule, niet 1e geplaatste.
- "best-third" — 8 beste 3e plaatsen die doorgaan (kies 8 verschillende teams die je verwacht als 3e te eindigen in hun poule).
- "r16" = laatste 16, "qf" = kwartfinale, "sf" = halve finale, "final" = finalisten.
- Een team mag in meerdere stages staan (als ze van r16 naar qf doorgaan etc.).

Realisme:
- Top-tier (Frankrijk, Spanje, Brazilië, Argentinië, Engeland, Duitsland, Portugal, Nederland) → poulewinnaar én ver in de knockout.
- Outsiders → kunnen 2e of 3e worden, soms r16 maar zelden verder.
- Voor 3e plaatsen: kies uit verschillende poules om verspreiding te krijgen.

Geef per slot het team ID terug.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      picks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            slotId: { type: Type.INTEGER },
            teamId: { type: Type.INTEGER },
          },
          required: ["slotId", "teamId"],
          propertyOrdering: ["slotId", "teamId"],
        },
      },
    },
    required: ["picks"],
    propertyOrdering: ["picks"],
  };

  const parsed = await callGeminiJson(prompt, responseSchema, BracketPredictionSchema);

  const openSlotIds = new Set(open.map((s) => s.id));
  const validTeamIds = new Set(teams.map((t) => t.id));
  let predicted = 0;
  for (const p of parsed.picks) {
    if (!openSlotIds.has(p.slotId)) continue;
    if (!validTeamIds.has(p.teamId)) continue;
    await db.insert(schema.bracketPredictions).values({
      userId,
      slotId: p.slotId,
      teamId: p.teamId,
      updatedAt: new Date(),
    });
    predicted++;
  }
  return { predicted, skipped: open.length - predicted };
}

/* --------------------------- Orchestrator --------------------------- */

export async function runAiPredictForUser(userId: number) {
  const m = await predictMatchesForUser(userId);
  const b = await predictBonusForUser(userId);
  const k = await predictBracketForUser(userId);
  return { matches: m, bonus: b, bracket: k };
}
