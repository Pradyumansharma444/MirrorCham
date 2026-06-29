import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { leaderboardEntries, userProfiles } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const leaderboardRouter = createRouter({
  global: publicQuery
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        sortBy: z.enum(["xp", "level", "streak"]).default("xp"),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 50;
      const sortCol =
        input?.sortBy === "level"
          ? leaderboardEntries.highestLevel
          : input?.sortBy === "streak"
            ? leaderboardEntries.streakDays
            : leaderboardEntries.totalXP;

      const result = await db
        .select()
        .from(leaderboardEntries)
        .orderBy(desc(sortCol))
        .limit(limit);

      return result.map((entry, idx) => ({
        rank: idx + 1,
        ...entry,
      }));
    }),

  myRank: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id as number;

    const entry = await db
      .select()
      .from(leaderboardEntries)
      .where(eq(leaderboardEntries.userId, userId))
      .then((r) => r[0]);

    if (!entry) return null;

    const allAbove = await db
      .select()
      .from(leaderboardEntries)
      .then((r) => r.filter((e) => e.totalXP > entry.totalXP).length);

    return {
      ...entry,
      rank: allAbove + 1,
    };
  }),

  updateEntry: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id as number;

    const profile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .then((r) => r[0]);

    if (!profile) return { success: false };

    const existing = await db
      .select()
      .from(leaderboardEntries)
      .where(eq(leaderboardEntries.userId, userId))
      .then((r) => r[0]);

    if (existing) {
      await db
        .update(leaderboardEntries)
        .set({
          username: ctx.user.name || "Anonymous",
          currentLevel: profile.currentLevel,
          totalXP: profile.totalXP,
          highestLevel: profile.highestLevel,
          streakDays: profile.streakDays,
          totalSessions: profile.totalSessions,
        })
        .where(eq(leaderboardEntries.userId, userId));
    } else {
      await db.insert(leaderboardEntries).values({
        userId,
        username: ctx.user.name || "Anonymous",
        currentLevel: profile.currentLevel,
        totalXP: profile.totalXP,
        highestLevel: profile.highestLevel,
        streakDays: profile.streakDays,
        totalSessions: profile.totalSessions,
      });
    }

    return { success: true };
  }),
});
