import bcrypt from "bcryptjs";
import {
  countAdmins,
  deleteUnlinkedLocalSocieties,
  ensurePolicies,
  findAdminByEmail,
  upsertAdmin,
  writeAudit,
} from "./store";
import { syncFromSuiteAsd } from "./suiteasd";

let booting: Promise<void> | null = null;

/** Ensures policies exist; optional env bootstrap if PLATFORM_BOOTSTRAP_PASSWORD is set. */
export async function ensureBootstrapped() {
  if (!booting) {
    booting = (async () => {
      await ensurePolicies();

      const adminCount = await countAdmins();
      if (adminCount > 0) return;

      const password = process.env.PLATFORM_BOOTSTRAP_PASSWORD?.trim() ?? "";
      if (password.length < 12) return;

      const email = (
        process.env.PLATFORM_BOOTSTRAP_EMAIL?.trim() ||
        "admin@suiteasd.platform"
      ).toLowerCase();
      if (await findAdminByEmail(email)) return;

      const passwordHash = await bcrypt.hash(password, 12);
      const adminId = await upsertAdmin({
        email,
        name: "Operatore piattaforma",
        passwordHash,
      });
      await deleteUnlinkedLocalSocieties();
      await syncFromSuiteAsd(adminId);
      await writeAudit({
        adminId,
        action: "SEED",
        detail: "bootstrap-from-env",
      });
    })().catch((error) => {
      booting = null;
      throw error;
    });
  }
  await booting;
}

export async function isAdminConfigured() {
  await ensurePolicies();
  return (await countAdmins()) > 0;
}

/** One-time first operator creation from the setup UI (no password in source). */
export async function createFirstAdmin(input: {
  email: string;
  password: string;
  name?: string;
}) {
  await ensurePolicies();
  if ((await countAdmins()) > 0) {
    throw new Error("already_configured");
  }
  const email = input.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const adminId = await upsertAdmin({
    email,
    name: input.name?.trim() || "Operatore piattaforma",
    passwordHash,
  });
  await deleteUnlinkedLocalSocieties();
  await syncFromSuiteAsd(adminId);
  await writeAudit({
    adminId,
    action: "SETUP",
    detail: "first-admin-from-ui",
  });
  return adminId;
}
