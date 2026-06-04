import { sqliteTable, text, integer, primaryKey, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(), // e.g. NED, ARG
  name: text("name").notNull(),
  flag: text("flag").notNull(), // emoji flag
  groupCode: text("group_code"), // A..L, null for placeholder slots
});

export const matches = sqliteTable(
  "matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    stage: text("stage").notNull(), // 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' | '3rd'
    groupCode: text("group_code"), // A..L for group matches
    matchday: integer("matchday"), // 1, 2, 3 for group; round number for knockout
    kickoff: integer("kickoff", { mode: "timestamp" }).notNull(),
    venue: text("venue").notNull(),
    homeTeamId: integer("home_team_id").references(() => teams.id),
    awayTeamId: integer("away_team_id").references(() => teams.id),
    // Placeholders for knockout matches before teams known
    homeLabel: text("home_label"), // e.g. "Winnaar groep A"
    awayLabel: text("away_label"),
    homeGoals: integer("home_goals"),
    awayGoals: integer("away_goals"),
    // For knockout matches that go to penalties
    winnerTeamId: integer("winner_team_id").references(() => teams.id),
    finished: integer("finished", { mode: "boolean" }).notNull().default(false),
  },
);

export const predictions = sqliteTable(
  "predictions",
  {
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    matchId: integer("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    homeGoals: integer("home_goals").notNull(),
    awayGoals: integer("away_goals").notNull(),
    // For knockout: which team progresses if draw after 90 min
    winnerTeamId: integer("winner_team_id").references(() => teams.id),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    pointsAwarded: integer("points_awarded").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.matchId] }),
  }),
);

export const bonusQuestions = sqliteTable("bonus_questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  type: text("type").notNull(), // 'team' | 'player' | 'text' | 'number'
  points: integer("points").notNull().default(10),
  // For 'team' type, optionally restrict to subset of team ids (JSON array)
  optionsJson: text("options_json"),
  correctAnswer: text("correct_answer"), // set by admin after tournament
  locksAt: integer("locks_at", { mode: "timestamp" }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const bonusAnswers = sqliteTable(
  "bonus_answers",
  {
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    questionId: integer("question_id").notNull().references(() => bonusQuestions.id, { onDelete: "cascade" }),
    answer: text("answer").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    pointsAwarded: integer("points_awarded").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.questionId] }),
  }),
);

// Knockout bracket predictions: user predicts which team advances at each slot
export const bracketSlots = sqliteTable("bracket_slots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  stage: text("stage").notNull(), // 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'winner'
  slotKey: text("slot_key").notNull().unique(), // e.g. 'r16-1', 'qf-3', 'final', 'winner'
  label: text("label").notNull(), // human readable
  points: integer("points").notNull().default(5),
  // Once a team is known to be at this slot, store it. Admin updates this.
  actualTeamId: integer("actual_team_id").references(() => teams.id),
});

export const bracketPredictions = sqliteTable(
  "bracket_predictions",
  {
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    slotId: integer("slot_id").notNull().references(() => bracketSlots.id, { onDelete: "cascade" }),
    teamId: integer("team_id").notNull().references(() => teams.id),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    pointsAwarded: integer("points_awarded").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.slotId] }),
  }),
);

// Key-value settings (e.g. tournament_locked_at, scoring config)
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type User = typeof users.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type BonusQuestion = typeof bonusQuestions.$inferSelect;
export type BonusAnswer = typeof bonusAnswers.$inferSelect;
export type BracketSlot = typeof bracketSlots.$inferSelect;
export type BracketPrediction = typeof bracketPredictions.$inferSelect;
