import { randomBytes } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { auditEvent } from "../services/audit.js";
import { normalizedEmail, boundedText, validPassword } from "../services/validation.js";
import { createAuthMiddleware } from "../middleware/auth.js";

const dummyPasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

const publicUser = ({ id, name, email, role, mustChangePassword = false }) => ({
  id,
  name,
  email,
  role,
  mustChangePassword,
});

function regenerateSession(request) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function setAuthenticatedSession(request, user) {
  request.session.userId = user.id;
  request.session.csrfToken = randomBytes(32).toString("hex");
}

export function createAuthRouter({
  db = prisma,
  authLimiter = (_request, _response, next) => next(),
} = {}) {
  const router = Router();
  const { requireAuth } = createAuthMiddleware(db);

  router.get("/csrf", (request, response) => {
    request.session.csrfToken ??= randomBytes(32).toString("hex");
    response.json({ csrfToken: request.session.csrfToken });
  });

  router.post("/register", authLimiter, async (request, response) => {
    const name = boundedText(request.body?.name, 100);
    const email = normalizedEmail(request.body?.email);
    const password = request.body?.password;

    if (!name || !email || !validPassword(password)) {
      response.status(400).json({
        error: "Provide a name, valid email, and password of 12-72 UTF-8 bytes.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await db.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { name, email, passwordHash },
        select: { id: true, name: true, email: true, role: true, mustChangePassword: true },
      });
      await auditEvent(transaction, request, {
        actorId: user.id,
        action: "auth.register",
        targetType: "User",
        targetId: user.id,
      });
      return user;
    });

    await regenerateSession(request);
    setAuthenticatedSession(request, created);
    response.status(201).json({ user: publicUser(created), csrfToken: request.session.csrfToken });
  });

  router.post("/login", authLimiter, async (request, response) => {
    const email = normalizedEmail(request.body?.email);
    const password = request.body?.password;
    const user = email ? await db.user.findUnique({ where: { email } }) : null;
    const passwordMatches = await bcrypt.compare(
      typeof password === "string" ? password : "",
      user?.passwordHash ?? dummyPasswordHash,
    );

    if (
      !user ||
      user.status !== "ACTIVE" ||
      !passwordMatches
    ) {
      await auditEvent(db, request, {
        actorId: user?.id,
        action: "auth.login.denied",
        targetType: "User",
        targetId: user?.id,
        metadata: { reason: "invalid_credentials_or_inactive" },
      });
      response.status(401).json({ error: "Invalid email or password." });
      return;
    }

    await db.$transaction(async (transaction) => {
      await auditEvent(transaction, request, {
        actorId: user.id,
        action: "auth.login",
        targetType: "User",
        targetId: user.id,
      });
    });
    await regenerateSession(request);
    setAuthenticatedSession(request, user);
    response.json({ user: publicUser(user), csrfToken: request.session.csrfToken });
  });

  router.get("/me", requireAuth, (request, response) => {
    response.json({ user: request.user });
  });

  router.post("/password", requireAuth, async (request, response) => {
    const currentPassword = request.body?.currentPassword;
    const newPassword = request.body?.newPassword;
    if (
      typeof currentPassword !== "string" ||
      !validPassword(newPassword) ||
      currentPassword === newPassword
    ) {
      response.status(400).json({
        error: "Provide your current password and a different 12-72 byte new password.",
      });
      return;
    }

    const user = await db.user.findUnique({ where: { id: request.user.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      response.status(401).json({ error: "Current password is incorrect." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });
      await auditEvent(transaction, request, {
        actorId: user.id,
        action: "auth.password.changed",
        targetType: "User",
        targetId: user.id,
      });
    });

    request.user.mustChangePassword = false;
    response.json({ user: request.user });
  });

  router.post("/logout", async (request, response, next) => {
    const userId = request.session?.userId;
    try {
      if (userId) {
        await auditEvent(db, request, {
          actorId: userId,
          action: "auth.logout",
          targetType: "User",
          targetId: userId,
        });
      }
      request.session.destroy((error) => {
        if (error) {
          next(error);
          return;
        }
        response.clearCookie("balancevault.sid", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
        response.status(204).end();
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
