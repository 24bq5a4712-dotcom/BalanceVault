import bcrypt from "bcryptjs";
import { auditEvent } from "./audit.js";
import { boundedText, normalizedEmail, validPassword } from "./validation.js";

export async function bootstrapAdmin({ db, name, email, password }) {
  const validName = boundedText(name, 100);
  const validEmail = normalizedEmail(email);
  if (!validName || !validEmail || !validPassword(password)) {
    throw new Error("Provide a valid admin name/email and a 12-72 byte password.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  return db.$transaction(async (transaction) => {
    const existingAdmins = await transaction.user.count({ where: { role: "ADMIN" } });
    if (existingAdmins > 0) {
      throw new Error("Administrator bootstrap is disabled because an admin already exists.");
    }

    const user = await transaction.user.create({
      data: {
        name: validName,
        email: validEmail,
        passwordHash,
        role: "ADMIN",
      },
      select: { id: true, name: true, email: true, role: true },
    });
    await auditEvent(transaction, null, {
      actorId: user.id,
      action: "admin.bootstrap",
      targetType: "User",
      targetId: user.id,
      metadata: { method: "one_time_cli" },
    });
    return user;
  }, { isolationLevel: "Serializable" });
}
