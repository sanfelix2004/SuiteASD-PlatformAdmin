-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SocietyAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "externalId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'LOCAL',
    "syncedAt" DATETIME,
    "sport" TEXT NOT NULL DEFAULT 'VOLLEY',
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "fiscalCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "billingPlan" TEXT NOT NULL DEFAULT 'PILOTA',
    "billingExempt" BOOLEAN NOT NULL DEFAULT true,
    "billingExemptReason" TEXT,
    "billingExemptUntil" DATETIME,
    "annualFeeCents" INTEGER NOT NULL DEFAULT 0,
    "membersCount" INTEGER NOT NULL DEFAULT 0,
    "teamsCount" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" DATETIME,
    "onboardedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SocietyAccount" ("annualFeeCents", "billingExempt", "billingExemptReason", "billingExemptUntil", "billingPlan", "city", "createdAt", "email", "fiscalCode", "id", "lastActiveAt", "membersCount", "name", "notes", "onboardedAt", "phone", "slug", "sport", "status", "teamsCount", "updatedAt") SELECT "annualFeeCents", "billingExempt", "billingExemptReason", "billingExemptUntil", "billingPlan", "city", "createdAt", "email", "fiscalCode", "id", "lastActiveAt", "membersCount", "name", "notes", "onboardedAt", "phone", "slug", "sport", "status", "teamsCount", "updatedAt" FROM "SocietyAccount";
DROP TABLE "SocietyAccount";
ALTER TABLE "new_SocietyAccount" RENAME TO "SocietyAccount";
CREATE UNIQUE INDEX "SocietyAccount_slug_key" ON "SocietyAccount"("slug");
CREATE UNIQUE INDEX "SocietyAccount_externalId_key" ON "SocietyAccount"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
