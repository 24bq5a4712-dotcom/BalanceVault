import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { createAuthMiddleware } from "../middleware/auth.js";
import { auditEvent } from "../services/audit.js";
import {
  boundedText,
  normalizedEmail,
  userRoles,
  userStatuses,
  validPassword,
} from "../services/validation.js";

const userFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  mustChangePassword: true,
  createdAt: true,
};

export function createAdminRouter({ db = prisma } = {}) {
  const router = Router();
  const { requireAuth, requireRole, requirePasswordUpdated } = createAuthMiddleware(db);
  router.use(requireAuth, requireRole("ADMIN"), requirePasswordUpdated);

  router.get("/users", async (_request, response) => {
    const users = await db.user.findMany({
      select: userFields,
      orderBy: { createdAt: "desc" },
    });
    response.json({ users });
  });

  router.post("/users", async (request, response) => {
    const name = boundedText(request.body?.name, 100);
    const email = normalizedEmail(request.body?.email);
    const password = request.body?.password;
    const role = request.body?.role ?? "HOLDER";
    if (!name || !email || !validPassword(password) || !userRoles.has(role)) {
      response.status(400).json({ error: "Invalid user details or role." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          name,
          email,
          passwordHash,
          role,
          mustChangePassword: true,
        },
        select: userFields,
      });
      await auditEvent(transaction, request, {
        actorId: request.user.id,
        action: "admin.user.created",
        targetType: "User",
        targetId: created.id,
        metadata: { role, onboarding: "temporary_password" },
      });
      return created;
    });
    response.status(201).json({ user });
  });

  router.patch("/users/:userId", async (request, response) => {
    const body = request.body ?? {};
    const changes = {};
    if ("name" in body) {
      const name = boundedText(body.name, 100);
      if (!name) {
        response.status(400).json({ error: "Invalid user name." });
        return;
      }
      changes.name = name;
    }
    if ("role" in body) {
      if (!userRoles.has(body.role)) {
        response.status(400).json({ error: "Invalid user role." });
        return;
      }
      changes.role = body.role;
    }
    if ("status" in body) {
      if (!userStatuses.has(body.status)) {
        response.status(400).json({ error: "Invalid user status." });
        return;
      }
      changes.status = body.status;
    }
    if (Object.keys(changes).length === 0) {
      response.status(400).json({ error: "Provide valid user fields to update." });
      return;
    }
    if (
      request.params.userId === request.user.id &&
      ((changes.role && changes.role !== "ADMIN") ||
        (changes.status && changes.status !== "ACTIVE"))
    ) {
      response.status(400).json({ error: "You cannot remove your own administrator access." });
      return;
    }

    const updated = await db.$transaction(async (transaction) => {
      const existing = await transaction.user.findUnique({
        where: { id: request.params.userId },
        select: { id: true, role: true, status: true },
      });
      if (!existing) return null;

      const removesActiveAdmin =
        existing.role === "ADMIN" &&
        existing.status === "ACTIVE" &&
        ((changes.role && changes.role !== "ADMIN") ||
          (changes.status && changes.status !== "ACTIVE"));
      if (removesActiveAdmin) {
        const activeAdmins = await transaction.user.count({
          where: { role: "ADMIN", status: "ACTIVE" },
        });
        if (activeAdmins <= 1) {
          const error = new Error("At least one active administrator must remain.");
          error.statusCode = 409;
          throw error;
        }
      }

      const user = await transaction.user.update({
        where: { id: existing.id },
        data: changes,
        select: userFields,
      });
      await auditEvent(transaction, request, {
        actorId: request.user.id,
        action: "admin.user.updated",
        targetType: "User",
        targetId: user.id,
        metadata: {
          fields: Object.keys(changes),
          ...(changes.role ? { role: user.role } : {}),
          ...(changes.status ? { status: user.status } : {}),
        },
      });
      return user;
    }, { isolationLevel: "Serializable" });

    if (!updated) {
      response.status(404).json({ error: "User not found." });
      return;
    }
    response.json({ user: updated });
  });

  router.post("/users/:userId/password-reset", async (request, response) => {
    const password = request.body?.temporaryPassword;
    if (!validPassword(password)) {
      response.status(400).json({ error: "Temporary password must be 12-72 UTF-8 bytes." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const reset = await db.$transaction(async (transaction) => {
      const existing = await transaction.user.findUnique({
        where: { id: request.params.userId },
        select: { id: true },
      });
      if (!existing) return false;

      await transaction.user.update({
        where: { id: existing.id },
        data: { passwordHash, mustChangePassword: true },
      });
      await auditEvent(transaction, request, {
        actorId: request.user.id,
        action: "admin.user.password_reset",
        targetType: "User",
        targetId: existing.id,
      });
      return true;
    });
    if (!reset) {
      response.status(404).json({ error: "User not found." });
      return;
    }
    response.status(204).end();
  });

  router.get("/audit-logs", async (request, response) => {
    const parsedLimit = Number.parseInt(request.query.limit, 10);
    const take = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
    const logs = await db.auditLog.findMany({
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actorId: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        ipAddress: true,
        createdAt: true,
      },
    });
    response.json({ logs });
  });

  return router;
}
