import bcrypt from "bcryptjs";
import { ensurePolicies, upsertAdmin, deleteUnlinkedLocalSocieties, writeAudit } from "../src/lib/store.ts";
import { syncFromSuiteAsd } from "../src/lib/suiteasd.ts";

process.env.AUTH_SECRET ||= "suiteasd-platform-admin-local-dev-secret-change-me-32";

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
