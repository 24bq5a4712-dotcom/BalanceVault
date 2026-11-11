import { prisma } from "../config/prisma.js";

export function createAuthMiddleware(db = prisma) {
  async function requireAuth(request, response, next) {
    if (!request.session?.userId) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    try {
      const user = await db.user.findUnique({
        where: { id: request.session.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          mustChangePassword: true,
        },
      });

      if (!user || user.status !== "ACTIVE") {
        request.session.destroy((error) => {
          if (error) {
            next(error);
            return;
          }
          response.status(401).json({ error: "Authentication required." });
        });
        return;
      }

      request.user = user;
      next();
    } catch (error) {
      next(error);
    }
  }

  function requireRole(...roles) {
    return (request, response, next) => {
      if (!request.user || !roles.includes(request.user.role)) {
        response.status(403).json({ error: "Insufficient permissions." });
        return;
      }
      next();
    };
  }

  function requirePasswordUpdated(request, response, next) {
    if (request.user?.mustChangePassword) {
      response.status(403).json({ error: "Change your temporary password to continue." });
      return;
    }
    next();
  }

  return { requireAuth, requireRole, requirePasswordUpdated };
}
