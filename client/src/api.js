export class ApiError extends Error {
  constructor(message, status, path) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
  }
}

async function readJson(response) {
  if (response.status === 204) return null;
  return response.json().catch(() => ({}));
}

export async function apiRequest(path, { method = "GET", body, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  const upperMethod = method.toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(upperMethod)) {
    const csrfResponse = await fetch("/api/auth/csrf", {
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    const csrfPayload = await readJson(csrfResponse);
    if (!csrfResponse.ok || typeof csrfPayload.csrfToken !== "string") {
      throw new ApiError(
        csrfPayload.error ?? csrfPayload.message ?? "Could not start a secure request.",
        csrfResponse.status,
        path,
      );
    }
    requestHeaders["x-csrf-token"] = csrfPayload.csrfToken;
  }

  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  requestHeaders.Accept = "application/json";
  const response = await fetch(path, {
    method: upperMethod,
    credentials: "include",
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new ApiError(
      payload.error ?? payload.message ?? "The request could not be completed.",
      response.status,
      path,
    );
  }
  return payload;
}

export function errorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Too many requests. Wait before trying again.";
    if (error.status === 403 && /csrf|origin is not allowed/i.test(error.message)) {
      return `CSRF/origin security check rejected the request: ${error.message}`;
    }
    if (error.status === 401 && error.path === "/api/auth/login") {
      return error.message || "Invalid email or password.";
    }
    if (error.status === 401) return "Your session has ended. Please sign in again.";
    return error.message;
  }
  return "Unable to reach BalanceVault. Check the API connection and try again.";
}
