import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfProtection(request, response, next) {
  if (safeMethods.has(request.method)) {
    next();
    return;
  }

  const origin = request.get("origin");
  if (origin && origin !== env.clientOrigin) {
    response.status(403).json({ error: "Request origin is not allowed." });
    return;
  }

  const token = request.get("x-csrf-token");
  const expected = request.session?.csrfToken;
  const tokenBuffer = typeof token === "string" ? Buffer.from(token) : Buffer.alloc(0);
  const expectedBuffer = typeof expected === "string" ? Buffer.from(expected) : Buffer.alloc(0);
  if (
    !/^[a-f0-9]{64}$/.test(token ?? "") ||
    tokenBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(tokenBuffer, expectedBuffer)
  ) {
    response.status(403).json({ error: "Invalid or missing CSRF token." });
    return;
  }

  next();
}
