import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import request from "supertest";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";
import { redisClient } from "../src/config/redis.js";
import { createApp } from "../src/app.js";

async function csrf(agent) {
  const response = await agent.get("/api/auth/csrf").expect(200);
  return response.body.csrfToken;
}

async function signIn(agent, email, password) {
  return agent.get("/api/auth/csrf").then(({ body }) =>
    agent.post("/api/auth/login")
      .set("x-csrf-token", body.csrfToken)
      .send({ email, password }));
}

async function mutate(agent, method, path, body, expectedStatus) {
  const token = await csrf(agent);
  let action = agent[method](path).set("x-csrf-token", token);
  if (body !== undefined) action = action.send(body);
  return expectedStatus === undefined ? action : action.expect(expectedStatus);
}

test("live PostgreSQL + Redis auth, account ownership, admin and audit integration", async () => {
  await prisma.$connect();
  if (!redisClient.isOpen) await redisClient.connect();
  assert.equal(await redisClient.ping(), "PONG");
  await prisma.$queryRaw`SELECT 1`;

  const runId = randomUUID();
  const emailSuffix = `${runId}@balancevault-integration.invalid`;
  const passwordHash = await bcrypt.hash("Integration-Password-42!", 10);
  let server;
  const activeAgents = [];

  try {
    const admin = await prisma.user.create({
      data: {
        name: "Integration Admin",
        email: `admin-${emailSuffix}`,
        passwordHash,
        role: "ADMIN",
      },
      select: { id: true, email: true },
    });
    const otherHolder = await prisma.user.create({
      data: {
        name: "Integration Other Holder",
        email: `other-${emailSuffix}`,
        passwordHash,
      },
      select: { id: true, email: true },
    });
    const app = createApp();
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const createAgent = () => {
      const agent = request.agent(base);
      return agent;
    };

    const adminAgent = createAgent();
    assert.equal((await signIn(adminAgent, admin.email, "Integration-Password-42!")).status, 200);
    activeAgents.push(adminAgent);
    await adminAgent.get("/api/admin/users").expect(200);
    await adminAgent.get("/api/accounts").expect(403);

    const onboardingPassword = "Temporary-Integration-Password-42!";
    const onboarding = await mutate(adminAgent, "post", "/api/admin/users", {
      name: "Integration New Holder",
      email: `onboarded-${emailSuffix}`,
      role: "HOLDER",
      password: onboardingPassword,
    }, 201);
    assert.equal(onboarding.body.user.mustChangePassword, true);
    assert.equal("passwordHash" in onboarding.body.user, false);

    const ownerAgent = createAgent();
    assert.equal((await signIn(ownerAgent, onboarding.body.user.email, onboardingPassword)).status, 200);
    activeAgents.push(ownerAgent);
    await ownerAgent.get("/api/accounts").expect(403);
    const passwordChanged = await mutate(ownerAgent, "post", "/api/auth/password", {
      currentPassword: onboardingPassword,
      newPassword: "Permanent-Integration-Password-43!",
    }, 200);
    assert.equal(passwordChanged.body.user.mustChangePassword, false);

    const createdAccount = await mutate(ownerAgent, "post", "/api/accounts", {
      name: "Integration checking",
      type: "BANK",
      institution: "Test institution",
      currency: "USD",
      balance: 999999,
    }, 201);
    const accountId = createdAccount.body.account.id;
    assert.equal(Number(createdAccount.body.account.balance), 0);
    await ownerAgent.get("/api/accounts").expect(200).expect(({ body }) => {
      assert.equal(body.accounts.length, 1);
      assert.equal(body.accounts[0].id, accountId);
    });

    const otherAgent = createAgent();
    assert.equal((await signIn(otherAgent, otherHolder.email, "Integration-Password-42!")).status, 200);
    activeAgents.push(otherAgent);
    await otherAgent.get("/api/accounts").expect(200).expect(({ body }) => {
      assert.deepEqual(body.accounts, []);
    });
    await mutate(otherAgent, "patch", `/api/accounts/${accountId}`, { name: "Not yours" })
      .then(({ status }) => assert.equal(status, 404));

    await mutate(ownerAgent, "patch", `/api/accounts/${accountId}`, { name: "Renamed integration account" })
      .then(({ status }) => assert.equal(status, 200));
    const auditResponse = await adminAgent.get("/api/admin/audit-logs?limit=100").expect(200);
    const auditActions = auditResponse.body.logs.map((log) => log.action);
    assert.ok(auditActions.includes("admin.user.created"));
    assert.ok(auditActions.includes("auth.password.changed"));
    assert.ok(auditActions.includes("account.created"));
    assert.ok(auditActions.includes("account.updated"));

    await mutate(ownerAgent, "delete", `/api/accounts/${accountId}`, undefined, 204);
    await ownerAgent.get("/api/accounts").expect(200).expect(({ body }) => {
      assert.deepEqual(body.accounts, []);
    });
    await adminAgent.get("/api/ready").expect(200).expect(({ body }) => {
      assert.deepEqual(body.checks, { database: "ok", redis: "ok" });
    });

    console.log("Live integration assertions passed against configured PostgreSQL and Redis.");
  } finally {
    for (const agent of activeAgents) {
      try {
        await mutate(agent, "post", "/api/auth/logout", undefined, 204);
      } catch (error) {
        console.error("Could not clear a live integration test session:", error.message);
      }
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    const testUsers = await prisma.user.findMany({
      where: { email: { contains: runId } },
      select: { id: true },
    });
    const userIds = testUsers.map(({ id }) => id);
    if (userIds.length) {
      const accounts = await prisma.account.findMany({
        where: { ownerId: { in: userIds } },
        select: { id: true },
      });
      const targets = userIds.concat(accounts.map(({ id }) => id));
      await prisma.$transaction([
        prisma.auditLog.deleteMany({
          where: { OR: [{ actorId: { in: userIds } }, { targetId: { in: targets } }] },
        }),
        prisma.account.deleteMany({ where: { ownerId: { in: userIds } } }),
        prisma.user.deleteMany({ where: { id: { in: userIds } } }),
      ]);
    }
    await prisma.$disconnect();
    if (redisClient.isOpen) await redisClient.quit();
  }
});
