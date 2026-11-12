import assert from "node:assert/strict";
import test from "node:test";
import session from "express-session";
import request from "supertest";
import bcrypt from "bcryptjs";
import { MemoryDatabase } from "./helpers/memoryDatabase.js";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/balancevault";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.SESSION_SECRET ??= "unit-test-session-secret-with-more-than-32-bytes";
process.env.CLIENT_ORIGIN ??= "http://localhost:5173";

const { createApp } = await import("../src/app.js");
const { bootstrapAdmin } = await import("../src/services/adminBootstrap.js");
const passThroughLimiter = (_request, _response, next) => next();

function makeAgent(db = new MemoryDatabase()) {
  const app = createApp({
    db,
    sessionStore: new session.MemoryStore(),
    limiter: passThroughLimiter,
    loginLimiter: passThroughLimiter,
  });
  return { agent: request.agent(app), db };
}

async function csrf(agent) {
  const response = await agent.get("/api/auth/csrf").expect(200);
  return response.body.csrfToken;
}

async function register(agent, { name, email, password = "Correct-Horse-42!" }) {
  const token = await csrf(agent);
  return agent
    .post("/api/auth/register")
    .set("x-csrf-token", token)
    .send({ name, email, password, role: "ADMIN" });
}

async function login(agent, email, password) {
  const token = await csrf(agent);
  return agent
    .post("/api/auth/login")
    .set("x-csrf-token", token)
    .send({ email, password });
}

test("CSRF, registration, login, and session cookie protections", async () => {
  const { agent, db } = makeAgent();
  const csrfToken = await csrf(agent);
  await agent.post("/api/auth/register")
    .send({ name: "A Holder", email: "holder@example.com", password: "Correct-Horse-42!" })
    .expect(403);

  await agent.post("/api/auth/register")
    .set("x-csrf-token", csrfToken)
    .set("Origin", "https://attacker.example")
    .send({ name: "A Holder", email: "holder@example.com", password: "Correct-Horse-42!" })
    .expect(403);

  await agent.post("/api/auth/register")
    .set("x-csrf-token", "not-a-valid-token")
    .send({ name: "A Holder", email: "holder@example.com", password: "Correct-Horse-42!" })
    .expect(403);

  const registration = await register(agent, {
    name: "A Holder",
    email: "Holder@Example.com",
  });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.user.email, "holder@example.com");
  assert.equal(registration.body.user.role, "HOLDER");
  assert.equal("passwordHash" in registration.body.user, false);
  assert.notEqual(db.users[0].passwordHash, "Correct-Horse-42!");
  assert.equal(db.auditLogs[0].action, "auth.register");
  assert.equal((await register(agent, {
    name: "Duplicate",
    email: "holder@example.com",
  })).status, 409);

  const loginAgent = makeAgent(db).agent;
  const denied = await login(loginAgent, "holder@example.com", "Incorrect-Password-42!");
  assert.equal(denied.status, 401);
  const loggedIn = await login(loginAgent, "HOLDER@example.com", "Correct-Horse-42!");
  assert.equal(loggedIn.status, 200);
  assert.equal(loggedIn.body.user.id, registration.body.user.id);
  assert.match(loggedIn.headers["set-cookie"][0], /HttpOnly/i);
  assert.match(loggedIn.headers["set-cookie"][0], /SameSite=Lax/i);
  await loginAgent.get("/api/auth/me").expect(200);
  await loginAgent.get("/api/auth/csrf")
    .then(({ body }) => loginAgent.post("/api/auth/logout")
      .set("x-csrf-token", body.csrfToken)
      .expect(204));
  assert.ok(db.auditLogs.some((entry) => entry.action === "auth.login"));
  assert.ok(db.auditLogs.some((entry) => entry.action === "auth.login.denied"));
  assert.ok(db.auditLogs.some((entry) => entry.action === "auth.logout"));
});

test("login requires a current CSRF token and an allowed origin", async () => {
  const { agent: registrationAgent, db } = makeAgent();
  const registration = await register(registrationAgent, {
    name: "CSRF Login Holder",
    email: "csrf-login-holder@example.com",
  });
  assert.equal(registration.status, 201);

  const repeatedLoginAgent = makeAgent(db).agent;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = await csrf(repeatedLoginAgent);
    const response = await repeatedLoginAgent
      .post("/api/auth/login")
      .set("x-csrf-token", token)
      .send({ email: "csrf-login-holder@example.com", password: "Correct-Horse-42!" });
    assert.equal(response.status, 200);
    assert.equal(response.body.user.role, "HOLDER");
  }

  const staleTokenAgent = makeAgent(db).agent;
  const staleToken = await csrf(staleTokenAgent);
  await staleTokenAgent
    .post("/api/auth/login")
    .set("x-csrf-token", staleToken)
    .send({ email: "csrf-login-holder@example.com", password: "Correct-Horse-42!" })
    .expect(200);
  const staleTokenResponse = await staleTokenAgent
    .post("/api/auth/login")
    .set("x-csrf-token", staleToken)
    .send({ email: "csrf-login-holder@example.com", password: "Correct-Horse-42!" })
    .expect(403);
  assert.equal(staleTokenResponse.body.error, "Invalid or missing CSRF token.");

  const disallowedOriginAgent = makeAgent(db).agent;
  const currentToken = await csrf(disallowedOriginAgent);
  const disallowedOriginResponse = await disallowedOriginAgent
    .post("/api/auth/login")
    .set("Origin", "https://attacker.example")
    .set("x-csrf-token", currentToken)
    .send({ email: "csrf-login-holder@example.com", password: "Correct-Horse-42!" })
    .expect(403);
  assert.equal(disallowedOriginResponse.body.error, "Request origin is not allowed.");
});

test("login regenerates the session identifier", async () => {
  const { db } = makeAgent();
  await register(makeAgent(db).agent, {
    name: "Session Rotation Holder",
    email: "session-rotation-holder@example.com",
  });

  const agent = makeAgent(db).agent;
  const csrfResponse = await agent.get("/api/auth/csrf").expect(200);
  const cookieValue = (headers) => headers
    .find((cookie) => cookie.startsWith("balancevault.sid="))
    .split(";", 1)[0];
  const beforeLogin = cookieValue(csrfResponse.headers["set-cookie"]);

  const loggedIn = await agent
    .post("/api/auth/login")
    .set("x-csrf-token", csrfResponse.body.csrfToken)
    .send({ email: "session-rotation-holder@example.com", password: "Correct-Horse-42!" })
    .expect(200);
  const afterLogin = cookieValue(loggedIn.headers["set-cookie"]);

  assert.notEqual(afterLogin, beforeLogin);
});

test("account access is authenticated, role-checked, owner-scoped, and audited", async () => {
  const db = new MemoryDatabase();
  const owner = makeAgent(db).agent;
  await owner.get("/api/accounts").expect(401);
  assert.equal((await register(owner, { name: "Owner", email: "owner@example.com" })).status, 201);

  const created = await owner
    .get("/api/auth/csrf")
    .then(({ body }) => owner.post("/api/accounts")
      .set("x-csrf-token", body.csrfToken)
      .send({ name: "Everyday", type: "BANK", balance: 9000000 }));
  assert.equal(created.status, 201);
  assert.equal(created.body.account.balance, "0.0000");
  assert.equal(db.accounts[0].balance, "0.0000");

  const stranger = makeAgent(db).agent;
  assert.equal((await register(stranger, { name: "Stranger", email: "stranger@example.com" })).status, 201);
  await stranger.get("/api/accounts").expect(200).expect(({ body }) => {
    assert.deepEqual(body.accounts, []);
  });
  const foreignUpdate = await stranger.get("/api/auth/csrf")
    .then(({ body }) => stranger.patch(`/api/accounts/${created.body.account.id}`)
      .set("x-csrf-token", body.csrfToken)
      .send({ name: "Taken over" }));
  assert.equal(foreignUpdate.status, 404);

  const ownUpdate = await owner.get("/api/auth/csrf")
    .then(({ body }) => owner.patch(`/api/accounts/${created.body.account.id}`)
      .set("x-csrf-token", body.csrfToken)
      .send({ name: "Daily account" }));
  assert.equal(ownUpdate.status, 200);
  const closed = await owner.get("/api/auth/csrf")
    .then(({ body }) => owner.delete(`/api/accounts/${created.body.account.id}`)
      .set("x-csrf-token", body.csrfToken));
  assert.equal(closed.status, 204);
  assert.deepEqual(
    db.auditLogs.filter((entry) => entry.targetType === "Account").map((entry) => entry.action),
    ["account.created", "account.updated", "account.closed"],
  );

  await owner.get("/api/admin/users").expect(403);
});

test("admin bootstrap is one-time; onboarding, password change, RBAC, and audit work", async () => {
  const db = new MemoryDatabase();
  const adminUser = await bootstrapAdmin({
    db,
    name: "Initial Admin",
    email: "admin@example.com",
    password: "Admin-Password-42!",
  });
  assert.equal(adminUser.role, "ADMIN");
  await assert.rejects(
    bootstrapAdmin({
      db,
      name: "Second Admin",
      email: "second@example.com",
      password: "Another-Password-42!",
    }),
    /already exists/,
  );

  const admin = makeAgent(db).agent;
  const adminLogin = await login(admin, adminUser.email, "Admin-Password-42!");
  assert.equal(adminLogin.status, 200);
  assert.equal(adminLogin.body.user.role, "ADMIN");
  const created = await admin.get("/api/auth/csrf")
    .then(({ body }) => admin.post("/api/admin/users")
      .set("x-csrf-token", body.csrfToken)
      .send({
        name: "New Holder",
        email: "new-holder@example.com",
        password: "Temporary-Password-42!",
      }));
  assert.equal(created.status, 201);
  assert.equal(created.body.user.mustChangePassword, true);
  assert.equal("passwordHash" in created.body.user, false);

  const holder = makeAgent(db).agent;
  const holderLogin = await login(holder, "new-holder@example.com", "Temporary-Password-42!");
  assert.equal(holderLogin.status, 200);
  assert.equal(holderLogin.body.user.mustChangePassword, true);
  await holder.get("/api/accounts").expect(403);
  await holder.get("/api/admin/audit-logs").expect(403);

  const changed = await holder.get("/api/auth/csrf")
    .then(({ body }) => holder.post("/api/auth/password")
      .set("x-csrf-token", body.csrfToken)
      .send({
        currentPassword: "Temporary-Password-42!",
        newPassword: "Permanent-Password-43!",
      }));
  assert.equal(changed.status, 200);
  assert.equal(changed.body.user.mustChangePassword, false);
  await holder.get("/api/accounts").expect(200);

  await holder.get("/api/admin/users").expect(403);
  await admin.get("/api/accounts").expect(403);
  const holderPrivilegeEscalation = await holder.get("/api/auth/csrf")
    .then(({ body }) => holder.patch(`/api/admin/users/${created.body.user.id}`)
      .set("x-csrf-token", body.csrfToken)
      .send({ role: "ADMIN" }));
  assert.equal(holderPrivilegeEscalation.status, 403);
  assert.equal(db.users.find((user) => user.id === created.body.user.id).role, "HOLDER");

  const selfDemotion = await admin.get("/api/auth/csrf")
    .then(({ body }) => admin.patch(`/api/admin/users/${adminUser.id}`)
      .set("x-csrf-token", body.csrfToken)
      .send({ role: "HOLDER" }));
  assert.equal(selfDemotion.status, 400);
  const selfSuspension = await admin.get("/api/auth/csrf")
    .then(({ body }) => admin.patch(`/api/admin/users/${adminUser.id}`)
      .set("x-csrf-token", body.csrfToken)
      .send({ status: "SUSPENDED" }));
  assert.equal(selfSuspension.status, 400);
  const invalidStatus = await admin.get("/api/auth/csrf")
    .then(({ body }) => admin.patch(`/api/admin/users/${created.body.user.id}`)
      .set("x-csrf-token", body.csrfToken)
      .send({ status: "UNKNOWN" }));
  assert.equal(invalidStatus.status, 400);
  assert.equal(db.users.find((user) => user.id === created.body.user.id).status, "ACTIVE");
  const suspended = await admin.get("/api/auth/csrf")
    .then(({ body }) => admin.patch(`/api/admin/users/${created.body.user.id}`)
      .set("x-csrf-token", body.csrfToken)
      .send({ status: "SUSPENDED" }));
  assert.equal(suspended.status, 200);
  assert.equal(suspended.body.user.status, "SUSPENDED");
  await holder.get("/api/auth/me").expect(401);

  const auditResponse = await admin.get("/api/admin/audit-logs").expect(200);
  const actions = auditResponse.body.logs.map((entry) => entry.action);
  assert.ok(actions.includes("admin.bootstrap"));
  assert.ok(actions.includes("admin.user.created"));
  assert.ok(actions.includes("auth.password.changed"));
  assert.ok(actions.includes("admin.user.updated"));
  assert.ok(!JSON.stringify(auditResponse.body).includes("Temporary-Password-42!"));
});
