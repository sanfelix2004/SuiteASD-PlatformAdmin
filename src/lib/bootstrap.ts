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

/**
 * Creates the first platform admin only when PLATFORM_BOOTSTRAP_PASSWORD
 * (and optional PLATFORM_BOOTSTRAP_EMAIL) are provided via environment secrets.
 * Never embeds a default password in shipped source.
 */
export async function ensureBootstrapped() {
  if (!booting) {
    booting = (async () => {
      await ensurePolicies();

      const adminCount = await countAdmins();
      if (adminCount > 0) return;

      const password = process.env.PLATFORM_BOOTSTRAP_PASSWORD?.trim() ?? "";
      const email = (
        process.env.PLATFORM_BOOTSTRAP_EMAIL?.trim() ||
        "admin@suiteasd.platform"
      ).toLowerCase();

      if (password.length < 12) {
        // No operator yet and no bootstrap secret: leave the DB empty.
        return;
      }

      const existing = await findAdminByEmail(email);
      if (existing) return;

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
