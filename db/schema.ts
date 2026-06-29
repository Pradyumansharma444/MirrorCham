import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  bigint,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

// NOTE: The `users` table is managed by the auth system (api/kimi/).
// We define a minimal reference here for FK relationships only.
// Do NOT modify the users table definition - it was created by the auth init.
// users table is managed by auth system - read-only reference
export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement(),
  unionId: varchar("unionId", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: varchar("role", { length: 20 }),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
  lastSignInAt: timestamp("lastSignInAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// User profiles - gamification data
export const userProfiles = mysqlTable("user_profiles", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .unique(),
  currentLevel: int("currentLevel").default(1).notNull(),
  highestLevel: int("highestLevel").default(1).notNull(),
  totalXP: int("totalXP").default(0).notNull(),
  streakDays: int("streakDays").default(0).notNull(),
  lastPracticeDate: date("lastPracticeDate"),
  longestStreak: int("longestStreak").default(0).notNull(),
  totalSessions: int("totalSessions").default(0).notNull(),
  totalSpeakingTime: int("totalSpeakingTime").default(0).notNull(),
  avgPaceScore: int("avgPaceScore"),
  avgClarityScore: int("avgClarityScore"),
  avgVocabScore: int("avgVocabScore"),
  avgConfidenceScore: int("avgConfidenceScore"),
  cloudSyncEnabled: boolean("cloudSyncEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// Practice sessions
export const sessions = mysqlTable("sessions", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  levelId: int("levelId").notNull(),
  promptId: int("promptId").notNull(),
  duration: int("duration").notNull(),
  targetDuration: int("targetDuration").notNull(),
  transcript: text("transcript"),
  wordCount: int("wordCount").default(0).notNull(),
  wpm: int("wpm"),
  fillerCount: int("fillerCount").default(0).notNull(),
  fillerWords: text("fillerWords"),
  advancedWordCount: int("advancedWordCount").default(0).notNull(),
  advancedWordsUsed: text("advancedWordsUsed"),
  paceScore: int("paceScore"),
  clarityScore: int("clarityScore"),
  vocabScore: int("vocabScore"),
  confidenceScore: int("confidenceScore"),
  toneScore: int("toneScore"),
  overallScore: int("overallScore"),
  xpEarned: int("xpEarned").default(0).notNull(),
  stars: int("stars").default(0).notNull(),
  badgeIds: text("badgeIds"),
  constraintMet: boolean("constraintMet").default(false).notNull(),
  constraintType: varchar("constraintType", { length: 100 }),
  practicedAt: timestamp("practicedAt").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

// Badge definitions
export const badges = mysqlTable("badges", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  badgeId: varchar("badgeId", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  tier: int("tier").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = typeof badges.$inferInsert;

// User badges (many-to-many)
export const userBadges = mysqlTable("user_badges", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  badgeId: bigint("badgeId", { mode: "number", unsigned: true }).notNull(),
  unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
  progress: text("progress"),
});

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;

// Leaderboard entries (denormalized for performance)
export const leaderboardEntries = mysqlTable("leaderboard_entries", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  username: varchar("username", { length: 255 }).notNull(),
  currentLevel: int("currentLevel").default(1).notNull(),
  totalXP: int("totalXP").default(0).notNull(),
  highestLevel: int("highestLevel").default(1).notNull(),
  streakDays: int("streakDays").default(0).notNull(),
  totalSessions: int("totalSessions").default(0).notNull(),
  avgOverallScore: int("avgOverallScore"),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboardEntries.$inferInsert;