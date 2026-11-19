import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { FIELD_GROUPS } from "../src/lib/fields";

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

  const societies = [
    {
      name: "Aquile Volley",
      slug: "aquile-volley",
      city: "Cuneo",
      email: "segreteria@aquilevolley.it",
      phone: "+39 0171 000001",
      fiscalCode: "90012345678",
      status: "ACTIVE",
      billingPlan: "PILOTA",
      billingExempt: true,
      billingExemptReason: "Pilota stagione 2026/27 — nessun addebito",
      membersCount: 118,
      teamsCount: 6,
      annualFeeCents: 0,
    },
    {
      name: "Delfini Volley",
      slug: "delfini-volley",
      city: "Torino",
      email: "info@delfinivolley.it",
      phone: "+39 011 000002",
      fiscalCode: "90087654321",
      status: "ACTIVE",
      billingPlan: "SOCIETA",
      billingExempt: true,
      billingExemptReason: "Esenzione commerciale operatori",
      membersCount: 84,
      teamsCount: 4,
      annualFeeCents: 14900,
    },
    {
      name: "Falchi ASD",
      slug: "falchi-asd",
      city: "Alessandria",
      email: "presidenza@falchiasd.it",
      status: "PENDING",
      billingPlan: "PILOTA",
      billingExempt: true,
      billingExemptReason: "In onboarding",
      membersCount: 12,
      teamsCount: 1,
      annualFeeCents: 0,
    },
    {
      name: "Leoni Sport",
      slug: "leoni-sport",
      city: "Asti",
      email: "segreteria@leonisport.it",
      status: "SUSPENDED",
      billingPlan: "SQUADRA",
      billingExempt: false,
      billingExemptReason: null,
      membersCount: 40,
      teamsCount: 2,
      annualFeeCents: 9900,
    },
  ] as const;

  for (const row of societies) {
    const society = await prisma.societyAccount.upsert({
      where: { slug: row.slug },
      create: {
        ...row,
        lastActiveAt: new Date(),
        billingExemptUntil: row.billingExempt
          ? new Date("2027-05-31T00:00:00.000Z")
          : null,
      },
      update: {
        ...row,
        lastActiveAt: new Date(),
      },
    });

    for (const group of FIELD_GROUPS) {
      await prisma.societyFieldAccess.upsert({
        where: {
          societyId_fieldGroup: {
            societyId: society.id,
            fieldGroup: group.key,
          },
        },
        create: {
          societyId: society.id,
          fieldGroup: group.key,
          canView: group.canViewDefault,
          canEdit: group.canEditDefault,
        },
        update: {},
      });
    }

    await prisma.metricSnapshot.create({
      data: {
        societyId: society.id,
        activeUsers7d: Math.max(3, Math.round(row.membersCount / 8)),
        logins7d: Math.max(5, Math.round(row.membersCount / 4)),
        documentsCount: Math.round(row.membersCount * 1.4),
        paymentsCents: row.billingExempt ? 0 : row.membersCount * 6000,
        eventsCount: row.teamsCount * 12,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      adminId: admin.id,
      action: "SEED",
      detail: "Bootstrap back-office piattaforma",
    },
  });

  console.log("Seed OK");
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
