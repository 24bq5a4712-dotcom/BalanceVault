import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "../config/redis.js";

function createDeferredRedisStore(prefix) {
  let redisStore;
  let storeOptions;

  function getRedisStore() {
    if (!redisClient.isReady) {
      throw new Error("Redis is unavailable; rate limiting cannot be enforced.");
    }

    if (!redisStore) {
      redisStore = new RedisStore({
        prefix,
        sendCommand: (...args) => redisClient.sendCommand(args),
      });
      if (storeOptions) redisStore.init(storeOptions);
    }
    return redisStore;
  }

  return {
    init(options) {
      storeOptions = options;
    },
    get(key) {
      return getRedisStore().get(key);
    },
    increment(key) {
      return getRedisStore().increment(key);
    },
    decrement(key) {
      return getRedisStore().decrement(key);
    },
    resetKey(key) {
      return getRedisStore().resetKey(key);
    },
  };
}

function createRedisRateLimiter({ prefix, limit }) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    passOnStoreError: false,
    store: createDeferredRedisStore(prefix),
  });
}

export const apiRateLimiter = createRedisRateLimiter({
  prefix: "balancevault:api:",
  limit: 100,
});

export const authRateLimiter = createRedisRateLimiter({
  prefix: "balancevault:auth:",
  limit: 10,
});
