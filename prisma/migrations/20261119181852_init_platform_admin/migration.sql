-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SocietyAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "SocietyFieldAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "societyId" TEXT NOT NULL,
    "fieldGroup" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SocietyFieldAccess_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "SocietyAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "societyId" TEXT NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUsers7d" INTEGER NOT NULL DEFAULT 0,
    "logins7d" INTEGER NOT NULL DEFAULT 0,
    "documentsCount" INTEGER NOT NULL DEFAULT 0,
    "paymentsCents" INTEGER NOT NULL DEFAULT 0,
    "eventsCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MetricSnapshot_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "SocietyAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocietyNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "societyId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocietyNote_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "SocietyAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT,
    "societyId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "SocietyAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VisibilityPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldGroup" TEXT NOT NULL,
    "labelIt" TEXT NOT NULL,
    "descriptionIt" TEXT NOT NULL,
    "canViewDefault" BOOLEAN NOT NULL DEFAULT false,
    "canEditDefault" BOOLEAN NOT NULL DEFAULT false,
    "sensitive" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SocietyAccount_slug_key" ON "SocietyAccount"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SocietyFieldAccess_societyId_fieldGroup_key" ON "SocietyFieldAccess"("societyId", "fieldGroup");

-- CreateIndex
CREATE UNIQUE INDEX "VisibilityPolicy_fieldGroup_key" ON "VisibilityPolicy"("fieldGroup");
