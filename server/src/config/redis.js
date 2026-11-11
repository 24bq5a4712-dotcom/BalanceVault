import { createClient } from "redis";
import { env } from "./env.js";

export const redisClient = createClient({
  url: env.redisUrl,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 1000, 10_000),
  },
});

redisClient.on("error", (error) => {
  console.error("Redis client error:", error.message);
});
