import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { createAuthMiddleware } from "../middleware/auth.js";
import { auditEvent } from "../services/audit.js";
import { accountTypes, boundedText } from "../services/validation.js";

const accountFields = {
  id: true,
  name: true,
  type: true,
  institution: true,
  currency: true,
  balance: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

function parseAccountChanges(body) {
  const changes = {};
  if ("name" in body) {
    const name = boundedText(body.name, 100);
    if (!name) return null;
    changes.name = name;
  }
  if ("type" in body) {
    if (!accountTypes.has(body.type)) return null;
    changes.type = body.type;
  }
  if ("institution" in body) {
    if (body.institution === null || body.institution === "") {
      changes.institution = null;
    } else {
      const institution = boundedText(body.institution, 100);
      if (!institution) return null;
      changes.institution = institution;
    }
  }
  if ("currency" in body) {
    if (typeof body.currency !== "string" || !/^[A-Za-z]{3}$/.test(body.currency)) {
      return null;
    }
    changes.currency = body.currency.toUpperCase();
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

export function createAccountRouter({ db = prisma } = {}) {
  const router = Router();
  const { requireAuth, requireRole, requirePasswordUpdated } = createAuthMiddleware(db);
  router.use(requireAuth, requireRole("HOLDER"), requirePasswordUpdated);

  router.get("/", async (request, response) => {
    const accounts = await db.account.findMany({
      where: { ownerId: request.user.id, status: "ACTIVE" },
      select: accountFields,
      orderBy: { createdAt: "desc" },
    });
    response.json({ accounts });
  });

  router.post("/", async (request, response) => {
    const name = boundedText(request.body?.name, 100);
    const type = request.body?.type;
    const currency = request.body?.currency ?? "USD";
    const institution = request.body?.institution;
    if (
      !name ||
      !accountTypes.has(type) ||
      typeof currency !== "string" ||
      !/^[A-Za-z]{3}$/.test(currency) ||
      (institution !== undefined && institution !== null &&
        institution !== "" && !boundedText(institution, 100))
    ) {
      response.status(400).json({ error: "Invalid account details." });
      return;
    }

    const account = await db.$transaction(async (transaction) => {
      const created = await transaction.account.create({
        data: {
          ownerId: request.user.id,
          name,
          type,
          institution: institution ? boundedText(institution, 100) : null,
          currency: currency.toUpperCase(),
        },
        select: accountFields,
      });
      await auditEvent(transaction, request, {
        actorId: request.user.id,
        action: "account.created",
        targetType: "Account",
        targetId: created.id,
        metadata: { type: created.type, currency: created.currency },
      });
      return created;
    });
    response.status(201).json({ account });
  });

  router.patch("/:accountId", async (request, response) => {
    const changes = parseAccountChanges(request.body ?? {});
    if (!changes) {
      response.status(400).json({ error: "Provide valid account fields to update." });
      return;
    }
    const account = await db.$transaction(async (transaction) => {
      const existing = await transaction.account.findFirst({
        where: { id: request.params.accountId, ownerId: request.user.id, status: "ACTIVE" },
        select: { id: true },
      });
      if (!existing) return null;

      const updated = await transaction.account.update({
        where: { id: existing.id },
        data: changes,
        select: accountFields,
      });
      await auditEvent(transaction, request, {
        actorId: request.user.id,
        action: "account.updated",
        targetType: "Account",
        targetId: updated.id,
        metadata: { fields: Object.keys(changes) },
      });
      return updated;
    });
    if (!account) {
      response.status(404).json({ error: "Account not found." });
      return;
    }
    response.json({ account });
  });

  router.delete("/:accountId", async (request, response) => {
    const closed = await db.$transaction(async (transaction) => {
      const existing = await transaction.account.findFirst({
        where: { id: request.params.accountId, ownerId: request.user.id, status: "ACTIVE" },
        select: { id: true },
      });
      if (!existing) return false;

      await transaction.account.update({
        where: { id: existing.id },
        data: { status: "CLOSED" },
      });
      await auditEvent(transaction, request, {
        actorId: request.user.id,
        action: "account.closed",
        targetType: "Account",
        targetId: existing.id,
      });
      return true;
    });
    if (!closed) {
      response.status(404).json({ error: "Account not found." });
      return;
    }
    response.status(204).end();
  });

  return router;
}
