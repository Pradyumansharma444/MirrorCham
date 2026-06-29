import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { badges, userBadges } from "@db/schema";
import { eq } from "drizzle-orm";

export const badgeRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(badges);
  }),

  mine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id as number;

    const earned = await db
      .select({
        id: badges.id,
        badgeId: badges.badgeId,
        name: badges.name,
        description: badges.description,
        category: badges.category,
        icon: badges.icon,
        tier: badges.tier,
        unlockedAt: userBadges.unlockedAt,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId));

    return earned;
  }),
});
