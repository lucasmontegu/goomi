import { initLogger } from "evlog";
import { createAuthMiddleware, type BetterAuthInstance } from "evlog/better-auth";
import { createFsDrain } from "evlog/fs";
import { evlog, type EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { contentApp } from "./content";
import { ENV } from "./env.server";
import { auth } from "./services";

initLogger({
  env: { service: "goomi-server" },
});

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

const app = new Hono<EvlogVariables>();

app.use(evlog({ drain: process.env.NODE_ENV === "production" ? undefined : createFsDrain() }));
app.use("*", async (c, next) => {
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
  await next();
});

app.use(
  "/*",
  cors({
    origin: ENV.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-goomi-install"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", async (c) => auth.handler(c.req.raw));

// Content bank, AI study, RevenueCat webhook and cron routes (ADR-001).
app.route("/", contentApp);

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
