import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FIELD_GROUPS } from "../src/lib/fields";
import { syncFromSuiteAsd } from "../src/lib/suiteasd";

const prisma = new PrismaClient();

async function main() {
  for (const group of FIELD_GROUPS) {
    await prisma.visibilityPolicy.upsert({
      where: { fieldGroup: group.key },
      create: {
        fieldGroup: group.key,
        labelIt: group.labelIt,
        descriptionIt: group.descriptionIt,
        canViewDefault: group.canViewDefault,
        canEditDefault: group.canEditDefault,
        sensitive: group.sensitive,
      },
      update: {
        labelIt: group.labelIt,
        descriptionIt: group.descriptionIt,
        canViewDefault: group.canViewDefault,
        canEditDefault: group.canEditDefault,
        sensitive: group.sensitive,
      },
    });
  }

  const passwordHash = await bcrypt.hash("AdminSuiteASD2026!", 12);
  const admin = await prisma.platformAdmin.upsert({
    where: { email: "admin@suiteasd.platform" },
    create: {
      email: "admin@suiteasd.platform",
      name: "Operatore piattaforma",
      passwordHash,
    },
    update: { passwordHash, name: "Operatore piattaforma" },
  });

  // Remove old local-only demo societies that are not linked to SuiteASD
  await prisma.societyAccount.deleteMany({
    where: { OR: [{ source: "LOCAL" }, { externalId: null }] },
  });

  const sync = await syncFromSuiteAsd(admin.id);
  console.log("Seed OK");
  console.log("SuiteASD sync:", sync.mode, sync.upserted, sync.detail);
  console.log("Login: admin@suiteasd.platform / AdminSuiteASD2026!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
