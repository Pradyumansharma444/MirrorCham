import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";

// No need for HttpBindings from @hono/node-server – we're on Cloudflare
const app = new Hono();

// Middleware
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// OAuth callback route
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

// tRPC endpoint
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// Catch‑all for /api/*
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// ✅ Export the Hono app – Cloudflare Workers will call its `fetch` method
export default app;
