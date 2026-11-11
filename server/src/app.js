import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { createSessionMiddleware } from "./config/session.js";
import { prisma } from "./config/prisma.js";
import { redisClient } from "./config/redis.js";
import { apiRateLimiter, authRateLimiter } from "./middleware/rateLimiter.js";
import { csrfProtection } from "./middleware/csrf.js";
import { createAuthRouter } from "./routes/auth.js";
import { createHealthRouter } from "./routes/health.js";
import { createAccountRouter } from "./routes/accounts.js";
import { createAdminRouter } from "./routes/admin.js";

export function createApp({
  db = prisma,
  redis = redisClient,
  sessionStore,
  limiter = apiRateLimiter,
  loginLimiter = authRateLimiter,
} = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", createHealthRouter({ db, redis }));
  app.use(createSessionMiddleware(sessionStore));
  app.use("/api", csrfProtection);
  app.use("/api", limiter);
  app.use("/api/auth", createAuthRouter({ db, authLimiter: loginLimiter }));
  app.use("/api/accounts", createAccountRouter({ db }));
  app.use("/api/admin", createAdminRouter({ db }));

  app.use((error, _request, response, _next) => {
    if (error?.code === "P2002") {
      response.status(409).json({ error: "A record with that value already exists." });
      return;
    }
    if (error?.code === "P2034" || error?.statusCode === 409) {
      response.status(409).json({ error: "The operation conflicts with current state." });
      return;
    }
    if (error?.code === "P2025") {
      response.status(404).json({ error: "Record not found." });
      return;
    }
    console.error("Unhandled API error:", error);
    response.status(500).json({ error: "Internal server error" });
  });

  return app;
}

export const app = createApp();
