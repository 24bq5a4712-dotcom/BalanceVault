import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, errorMessage } from "../src/api.js";

test("login credential errors are not reported as expired sessions", () => {
  assert.equal(
    errorMessage(new ApiError("Invalid email or password.", 401, "/api/auth/login")),
    "Invalid email or password.",
  );
});

test("rate limits and CSRF rejections have distinct frontend messages", () => {
  assert.equal(
    errorMessage(new ApiError("Too many requests, please try again later.", 429, "/api/auth/login")),
    "Too many requests. Wait before trying again.",
  );
  assert.equal(
    errorMessage(new ApiError("Invalid or missing CSRF token.", 403, "/api/auth/login")),
    "CSRF/origin security check rejected the request: Invalid or missing CSRF token.",
  );
  assert.equal(
    errorMessage(new ApiError("Request origin is not allowed.", 403, "/api/auth/login")),
    "CSRF/origin security check rejected the request: Request origin is not allowed.",
  );
});

test("session and authorization errors keep their separate meanings", () => {
  assert.equal(
    errorMessage(new ApiError("Unauthenticated.", 401, "/api/auth/me")),
    "Your session has ended. Please sign in again.",
  );
  assert.equal(
    errorMessage(new ApiError("Administrator access is required.", 403, "/api/admin/users")),
    "Administrator access is required.",
  );
});
