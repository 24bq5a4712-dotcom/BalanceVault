import "dotenv/config";
import { prisma } from "../config/prisma.js";
import { bootstrapAdmin } from "../services/adminBootstrap.js";

const { BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } = process.env;

try {
  if (!BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) {
    throw new Error("Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD for this command.");
  }

  const admin = await bootstrapAdmin({
    db: prisma,
    name: BOOTSTRAP_ADMIN_NAME ?? "BalanceVault Admin",
    email: BOOTSTRAP_ADMIN_EMAIL,
    password: BOOTSTRAP_ADMIN_PASSWORD,
  });
  console.log(`Created initial administrator: ${admin.email}`);
} catch (error) {
  console.error(`Administrator bootstrap failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
