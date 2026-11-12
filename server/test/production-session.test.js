import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import session from "express-session";
import test from "node:test";
import request from "supertest";
import { MemoryDatabase } from "./helpers/memoryDatabase.js";

process.env.DOTENV_CONFIG_PATH = join(tmpdir(), `balancevault-no-dotenv-${process.pid}`);
process.env.NODE_ENV = "production";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/balancevault";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.SESSION_SECRET = "unit-test-session-secret-with-more-than-32-bytes";
process.env.CLIENT_ORIGIN = "https://balancevault.example";

const { createApp } = await import("../src/app.js");
const passThroughLimiter = (_request, _response, next) => next();

test("production trusts one Render proxy hop and issues a secure session cookie", async () => {
  const app = createApp({
    db: new MemoryDatabase(),
    redis: { isReady: true, ping: async () => "PONG" },
    sessionStore: new session.MemoryStore(),
    limiter: passThroughLimiter,
    loginLimiter: passThroughLimiter,
  });

  assert.equal(app.get("trust proxy"), 1);

  const response = await request(app)
    .get("/api/auth/csrf")
    .set("X-Forwarded-Proto", "https")
    .expect(200);

  const sessionCookie = response.headers["set-cookie"]
    ?.find((cookie) => cookie.startsWith("balancevault.sid="));
  assert.ok(sessionCookie);
  assert.match(sessionCookie, /;\s*Secure/i);
  assert.match(sessionCookie, /;\s*HttpOnly/i);
  assert.match(sessionCookie, /;\s*SameSite=Lax/i);
});
