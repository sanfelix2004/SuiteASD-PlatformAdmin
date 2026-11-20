import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  deleteUnlinkedLocalSocieties,
  ensurePolicies,
  upsertAdmin,
  writeAudit,
} from "../src/lib/store";
import { syncFromSuiteAsd } from "../src/lib/suiteasd";

async function main() {
  const authSecret = process.env.AUTH_SECRET?.trim();
  if (!authSecret || authSecret.length < 32) {
    throw new Error("Set AUTH_SECRET (>= 32 chars) before seeding");
  }

  const email = (
    process.env.PLATFORM_BOOTSTRAP_EMAIL?.trim() || "admin@suiteasd.platform"
  ).toLowerCase();
  const password =
    process.env.PLATFORM_BOOTSTRAP_PASSWORD?.trim() ||
    randomBytes(18).toString("base64url");

  if (!process.env.PLATFORM_BOOTSTRAP_PASSWORD?.trim()) {
    console.log(
      "PLATFORM_BOOTSTRAP_PASSWORD was not set; generated a one-time local password (shown once below).",
    );
  }

  await ensurePolicies();
  const passwordHash = await bcrypt.hash(password, 12);
  const adminId = await upsertAdmin({
    email,
    name: "Operatore piattaforma",
    passwordHash,
  });
  await deleteUnlinkedLocalSocieties();
  const sync = await syncFromSuiteAsd(adminId);
  await writeAudit({ adminId, action: "SEED", detail: "cli-seed" });
  console.log("Seed OK", sync.mode, sync.upserted, sync.detail);
  console.log(`Admin email: ${email}`);
  console.log(`Admin password: ${password}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
