import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { userProfiles, sessions } from "@db/schema";
import { eq } from "drizzle-orm";

function calculateTierInfo(level: number) {
  const tiers = [
    { min: 1, max: 19, name: "Bronze", badge: "bronze", color: "#CD7F32", xpBonus: 0 },
    { min: 20, max: 49, name: "Silver", badge: "silver", color: "#C0C0C0", xpBonus: 50 },
    { min: 50, max: 99, name: "Gold", badge: "gold", color: "#FFD700", xpBonus: 100 },
    { min: 100, max: 149, name: "Platinum", badge: "platinum", color: "#E5E4E2", xpBonus: 150 },
    { min: 150, max: 199, name: "Diamond", badge: "diamond", color: "#B9F2FF", xpBonus: 200 },
    { min: 200, max: 249, name: "Crown", badge: "crown", color: "#FFD700", xpBonus: 250 },
    { min: 250, max: 299, name: "Ace", badge: "ace", color: "#FF4444", xpBonus: 300 },
    { min: 300, max: 349, name: "Conqueror", badge: "conqueror", color: "#8B0000", xpBonus: 350 },
    { min: 350, max: 399, name: "Master", badge: "master", color: "#4169E1", xpBonus: 400 },
    { min: 400, max: 449, name: "Elite Master", badge: "elite", color: "#9400D3", xpBonus: 450 },
    { min: 450, max: 499, name: "Grandmaster", badge: "grandmaster", color: "#FF4500", xpBonus: 500 },
  ];

  if (level >= 500) {
    const stars = Math.min(Math.floor((level - 400) / 100), 6);
    return {
      name: `Grandmaster ${"\u2605".repeat(stars)}`,
      badge: `grandmaster_star_${stars}`,
      color: "#FFD700",
      xpBonus: 500 + stars * 50,
      stars,
    };
  }

  return tiers.find((t) => level >= t.min && level <= t.max) || tiers[0];
}

function calculateXP(levelId: number, overallScore: number, stars: number, constraintMet: boolean, fillerCount: number): number {
  const baseXP = 10;
  const levelMultiplier = 1 + levelId * 0.05;
  const scoreBonus = Math.floor((overallScore / 100) * 20);
  const constraintBonus = constraintMet ? 5 : 0;
  const noFillerBonus = fillerCount === 0 ? 5 : 0;
  const starBonus = stars * 3;
  const tierInfo = calculateTierInfo(levelId);
  return Math.floor((baseXP + scoreBonus + constraintBonus + noFillerBonus + starBonus) * levelMultiplier) + tierInfo.xpBonus;
}

export const progressRouter = createRouter({
  get: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id as number;

    let profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).then((r) => r[0]);

    if (!profile) {
      await db.insert(userProfiles).values({ userId });
      profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).then((r) => r[0]);
    }

    return {
      ...profile,
      tier: calculateTierInfo(profile.currentLevel),
    };
  }),

  submit: authedQuery
    .input(
      z.object({
        levelId: z.number().int().min(1),
        promptId: z.number().int(),
        duration: z.number().int(),
        targetDuration: z.number().int(),
        transcript: z.string().optional(),
        wordCount: z.number().int().default(0),
        wpm: z.number().int().nullable(),
        fillerCount: z.number().int().default(0),
        fillerWords: z.array(z.string()).default([]),
        advancedWordCount: z.number().int().default(0),
        advancedWordsUsed: z.array(z.string()).default([]),
        paceScore: z.number().int().min(0).max(100).nullable(),
        clarityScore: z.number().int().min(0).max(100).nullable(),
        vocabScore: z.number().int().min(0).max(100).nullable(),
        confidenceScore: z.number().int().min(0).max(100).nullable(),
        toneScore: z.number().int().min(0).max(100).nullable(),
        overallScore: z.number().int().min(0).max(100).nullable(),
        constraintMet: z.boolean().default(false),
        constraintType: z.string().nullable(),
        stars: z.number().int().min(0).max(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id as number;

      const xpEarned = calculateXP(
        input.levelId,
        input.overallScore || 0,
        input.stars,
        input.constraintMet,
        input.fillerCount
      );

      // Insert session
      await db.insert(sessions).values({
        userId,
        ...input,
        fillerWords: JSON.stringify(input.fillerWords),
        advancedWordsUsed: JSON.stringify(input.advancedWordsUsed),
        badgeIds: "[]",
        xpEarned,
      });

      // Update profile
      let profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).then((r) => r[0]);

      if (!profile) {
        await db.insert(userProfiles).values({ userId });
        profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).then((r) => r[0]);
      }

      const newTotalXP = profile.totalXP + xpEarned;
      const newHighestLevel = Math.max(profile.highestLevel, input.levelId);
      const unlockedNext = input.levelId >= profile.currentLevel;
      const newCurrentLevel = unlockedNext ? input.levelId + 1 : profile.currentLevel;
      const newTotalSessions = profile.totalSessions + 1;
      const newTotalSpeakingTime = profile.totalSpeakingTime + input.duration;

      // Update averages
      const allSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId));

      const avgPace = allSessions.length > 0
        ? Math.round(allSessions.reduce((sum, s) => sum + (s.paceScore || 0), 0) / allSessions.length)
        : null;
      const avgClarity = allSessions.length > 0
        ? Math.round(allSessions.reduce((sum, s) => sum + (s.clarityScore || 0), 0) / allSessions.length)
        : null;
      const avgVocab = allSessions.length > 0
        ? Math.round(allSessions.reduce((sum, s) => sum + (s.vocabScore || 0), 0) / allSessions.length)
        : null;
      const avgConfidence = allSessions.length > 0
        ? Math.round(allSessions.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) / allSessions.length)
        : null;

      await db
        .update(userProfiles)
        .set({
          totalXP: newTotalXP,
          currentLevel: newCurrentLevel,
          highestLevel: newHighestLevel,
          totalSessions: newTotalSessions,
          totalSpeakingTime: newTotalSpeakingTime,
          avgPaceScore: avgPace,
          avgClarityScore: avgClarity,
          avgVocabScore: avgVocab,
          avgConfidenceScore: avgConfidence,
        })
        .where(eq(userProfiles.userId, userId));

      return {
        xpEarned,
        newTotalXP,
        newCurrentLevel,
        unlockedNextLevel: unlockedNext,
        tier: calculateTierInfo(newCurrentLevel),
      };
    }),
});
