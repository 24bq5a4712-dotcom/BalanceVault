export const accountTypes = new Set(["BANK", "CASH", "CREDIT", "INVESTMENT", "OTHER"]);
export const userRoles = new Set(["HOLDER", "ADMIN"]);
export const userStatuses = new Set(["ACTIVE", "SUSPENDED"]);

export function normalizedEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null;
}

export function validPassword(value) {
  return (
    typeof value === "string" &&
    value.length >= 12 &&
    Buffer.byteLength(value, "utf8") <= 72
  );
}

export function boundedText(value, maxLength) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}
