import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { redisClient } from "./config/redis.js";

const server = app.listen(env.port, () => {
  console.log(`BalanceVault API listening on http://localhost:${env.port}`);
});

redisClient.connect().catch((error) => {
  console.error("Initial Redis connection failed; reconnect attempts will continue:", error.message);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async (serverError) => {
    if (serverError) {
      console.error("HTTP server shutdown failed:", serverError);
      process.exitCode = 1;
    }

    try {
      await Promise.all([
        prisma.$disconnect(),
        redisClient.isOpen ? redisClient.quit() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error("Service shutdown failed:", error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
