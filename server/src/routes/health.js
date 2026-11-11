import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { redisClient } from "../config/redis.js";

export function createHealthRouter({ db = prisma, redis = redisClient } = {}) {
  const healthRouter = Router();

  healthRouter.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  healthRouter.get("/ready", async (_request, response) => {
    const checks = {
      database: "unavailable",
      redis: "unavailable",
    };

    try {
      await db.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch (error) {
      console.error("Database readiness check failed:", error.message);
    }

    try {
      if (!redis.isReady) {
        throw new Error("Redis client is not ready.");
      }
      await redis.ping();
      checks.redis = "ok";
    } catch (error) {
      console.error("Redis readiness check failed:", error.message);
    }

    const ready = Object.values(checks).every((status) => status === "ok");
    response.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "not_ready",
      checks,
    });
  });

  return healthRouter;
}
