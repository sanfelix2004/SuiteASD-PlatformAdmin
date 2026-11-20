import bcrypt from "bcryptjs";
import {
  deleteUnlinkedLocalSocieties,
  ensurePolicies,
  findAdminByEmail,
  upsertAdmin,
  writeAudit,
} from "./store";
import { syncFromSuiteAsd } from "./suiteasd";

let booting: Promise<void> | null = null;

export async function ensureBootstrapped() {
  if (!booting) {
    booting = (async () => {
      await ensurePolicies();
      const existing = await findAdminByEmail("admin@suiteasd.platform");
      if (!existing) {
        const passwordHash = await bcrypt.hash("AdminSuiteASD2026!", 12);
        const adminId = await upsertAdmin({
          email: "admin@suiteasd.platform",
          name: "Operatore piattaforma",
          passwordHash,
        });
        await deleteUnlinkedLocalSocieties();
        await syncFromSuiteAsd(adminId);
        await writeAudit({ adminId, action: "SEED", detail: "auto-bootstrap" });
      }
    })().catch((error) => {
      booting = null;
      throw error;
    });
  }
  await booting;
}
