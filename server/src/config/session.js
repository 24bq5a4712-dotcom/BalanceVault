import session from "express-session";
import { RedisStore } from "connect-redis";
import { env } from "./env.js";
import { redisClient } from "./redis.js";

export function createSessionMiddleware(store) {
  return session({
    name: "balancevault.sid",
    secret: env.sessionSecret,
    store: store ?? new RedisStore({
      client: redisClient,
      prefix: "balancevault:session:",
      ttl: 8 * 60 * 60,
    }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60 * 1000,
    },
  });
}
