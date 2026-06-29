import { authRouter } from "./auth-router";
import { progressRouter } from "./progress-router";
import { sessionRouter } from "./session-router";
import { badgeRouter } from "./badge-router";
import { leaderboardRouter } from "./leaderboard-router";
import { promptRouter } from "./prompt-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  progress: progressRouter,
  session: sessionRouter,
  badge: badgeRouter,
  leaderboard: leaderboardRouter,
  prompt: promptRouter,
});

export type AppRouter = typeof appRouter;
