import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { sessions } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const sessionRouter = createRouter({
  list: authedQuery
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id as number;
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.userId, userId))
        .orderBy(desc(sessions.practicedAt))
        .limit(limit)
        .offset(offset);

      return result;
    }),

  get: authedQuery
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.id))
        .then((r) => r[0]);
      return result || null;
    }),

  delete: authedQuery
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(sessions).where(eq(sessions.id, input.id));
      return { success: true };
    }),
});
