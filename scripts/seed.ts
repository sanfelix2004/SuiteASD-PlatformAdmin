import bcrypt from "bcryptjs";
import {
  deleteUnlinkedLocalSocieties,
  ensurePolicies,
  upsertAdmin,
  writeAudit,
} from "../src/lib/store";
import { syncFromSuiteAsd } from "../src/lib/suiteasd";

async function main() {
  process.env.AUTH_SECRET ||=
    "suiteasd-platform-admin-local-dev-secret-change-me-32";
  await ensurePolicies();
  const passwordHash = await bcrypt.hash("AdminSuiteASD2026!", 12);
  const adminId = await upsertAdmin({
    email: "admin@suiteasd.platform",
    name: "Operatore piattaforma",
    passwordHash,
  });
  await deleteUnlinkedLocalSocieties();
  const sync = await syncFromSuiteAsd(adminId);
  await writeAudit({ adminId, action: "SEED", detail: "bootstrap" });
  console.log("Seed OK", sync.mode, sync.upserted, sync.detail);
  console.log("Login: admin@suiteasd.platform / AdminSuiteASD2026!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
