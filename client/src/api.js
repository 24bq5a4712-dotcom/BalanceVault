export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
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
      throw new ApiError(csrfPayload.error ?? "Could not start a secure request.", csrfResponse.status);
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
    throw new ApiError(payload.error ?? "The request could not be completed.", response.status);
  }
  return payload;
}

export function errorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your session has ended. Please sign in again.";
    return error.message;
  }
  return "Unable to reach BalanceVault. Check the API connection and try again.";
}
