import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  addMetric,
  createSociety,
  findSocietyByExternalOrSlug,
  updateSociety,
  writeAudit,
} from "./store";

export type SuiteAsdSocietyRow = {
  externalId: string;
  name: string;
  slug: string;
  sport: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  fiscalCode: string | null;
  membersCount: number;
  teamsCount: number;
  documentsCount: number;
  eventsCount: number;
  paymentsCents: number;
};

export type SuiteAsdSourceInfo = {
  mode: "database" | "snapshot" | "unavailable";
  detail: string;
  societies: SuiteAsdSocietyRow[];
};

function snapshotPath() {
  return path.join(process.cwd(), "data", "suiteasd-snapshot.json");
}

function resolveSqlitePath(raw: string) {
  if (raw.startsWith("file:")) {
    const filePath = raw.slice("file:".length);
    if (path.isAbsolute(filePath)) return filePath;
    const candidates = [
      // Prisma convention: relative to prisma/
      path.resolve(process.cwd(), "prisma", filePath),
      // Relative to project root
      path.resolve(process.cwd(), filePath),
      path.resolve(process.cwd(), "data", path.basename(filePath)),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate;
    }
    return candidates[0];
  }
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

async function readFromSqlite(dbPath: string): Promise<SuiteAsdSocietyRow[]> {
  const Database = (await import("better-sqlite3")).default;
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const societies = db
      .prepare(
        `SELECT id, name, slug, sport, email, phone, city, fiscalCode
         FROM Society ORDER BY name ASC`,
      )
      .all() as Array<{
      id: string;
      name: string;
      slug: string;
      sport: string;
      email: string | null;
      phone: string | null;
      city: string | null;
      fiscalCode: string | null;
    }>;

    const countStmt = db.prepare(
      `SELECT
         (SELECT COUNT(*) FROM Member WHERE societyId = ?) AS membersCount,
         (SELECT COUNT(*) FROM Team WHERE societyId = ?) AS teamsCount,
         (SELECT COUNT(*) FROM Document WHERE societyId = ?) AS documentsCount,
         (SELECT COUNT(*) FROM Event WHERE societyId = ?) AS eventsCount,
         (SELECT COALESCE(SUM(amountCents), 0) FROM Payment WHERE societyId = ?) AS paymentsCents`,
    );

    return societies.map((society) => {
      const counts = countStmt.get(
        society.id,
        society.id,
        society.id,
        society.id,
        society.id,
      ) as {
        membersCount: number;
        teamsCount: number;
        documentsCount: number;
        eventsCount: number;
        paymentsCents: number;
      };
      return {
        externalId: society.id,
        name: society.name,
        slug: society.slug,
        sport: society.sport,
        email: society.email,
        phone: society.phone,
        city: society.city,
        fiscalCode: society.fiscalCode,
        membersCount: counts.membersCount,
        teamsCount: counts.teamsCount,
        documentsCount: counts.documentsCount,
        eventsCount: counts.eventsCount,
        paymentsCents: counts.paymentsCents,
      };
    });
  } finally {
    db.close();
  }
}

function readFromSnapshot(): SuiteAsdSocietyRow[] {
  const file = snapshotPath();
  if (!existsSync(file)) return [];
  const payload = JSON.parse(readFileSync(file, "utf8")) as {
    societies: SuiteAsdSocietyRow[];
  };
  return payload.societies ?? [];
}

/** Live SuiteASD DB when configured, otherwise snapshot exported from Mikirucci/SuiteASD seed. */
export async function loadSuiteAsdSocieties(): Promise<SuiteAsdSourceInfo> {
  const configured =
    process.env.SUITEASD_DATABASE_URL?.trim() ||
    process.env.SUITEASD_SQLITE_PATH?.trim() ||
    "";

  const candidates = [
    configured,
    path.join(process.cwd(), "data", "suiteasd-source.db"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const dbPath = resolveSqlitePath(candidate);
      if (!existsSync(dbPath)) continue;
      const societies = await readFromSqlite(dbPath);
      return {
        mode: "database",
        detail: `SuiteASD SQLite live · ${path.basename(dbPath)}`,
        societies,
      };
    } catch (error) {
      console.warn("SuiteASD sqlite read failed", candidate, error);
    }
  }

  const snapshot = readFromSnapshot();
  if (snapshot.length > 0) {
    return {
      mode: "snapshot",
      detail:
        "Snapshot da seed Mikirucci/SuiteASD (imposta SUITEASD_DATABASE_URL per il DB live)",
      societies: snapshot,
    };
  }

  return {
    mode: "unavailable",
    detail: "Nessuna fonte SuiteASD disponibile",
    societies: [],
  };
}

export async function syncFromSuiteAsd(adminId?: string | null) {
  const source = await loadSuiteAsdSocieties();
  let upserted = 0;

  for (const row of source.societies) {
    const existing = await findSocietyByExternalOrSlug(row.externalId, row.slug);
    if (existing) {
      await updateSociety(existing.id, {
        externalId: row.externalId,
        source: "SUITEASD",
        syncedAt: new Date().toISOString(),
        name: row.name,
        slug: row.slug,
        sport: row.sport || "VOLLEY",
        email: row.email,
        phone: row.phone,
        city: row.city,
        fiscalCode: row.fiscalCode,
        membersCount: row.membersCount,
        teamsCount: row.teamsCount,
      });
      await addMetric(existing.id, {
        activeUsers7d: Math.max(1, Math.round(row.membersCount / 10)),
        logins7d: Math.max(1, Math.round(row.membersCount / 5)),
        documentsCount: row.documentsCount,
        paymentsCents: row.paymentsCents,
        eventsCount: row.eventsCount,
      });
    } else {
      const created = await createSociety({
        name: row.name,
        slug: row.slug,
        sport: row.sport || "VOLLEY",
        email: row.email,
        phone: row.phone,
        city: row.city,
        fiscalCode: row.fiscalCode,
        status: "ACTIVE",
        billingPlan: "PILOTA",
        billingExempt: true,
        billingExemptReason: "Importata da SuiteASD — esenzione da definire",
        externalId: row.externalId,
        source: "SUITEASD",
      });
      if (created) {
        await updateSociety(created.society.id, {
          membersCount: row.membersCount,
          teamsCount: row.teamsCount,
          syncedAt: new Date().toISOString(),
        });
        await addMetric(created.society.id, {
          activeUsers7d: Math.max(1, Math.round(row.membersCount / 10)),
          logins7d: Math.max(1, Math.round(row.membersCount / 5)),
          documentsCount: row.documentsCount,
          paymentsCents: row.paymentsCents,
          eventsCount: row.eventsCount,
        });
      }
    }
    upserted += 1;
  }

  if (adminId) {
    await writeAudit({
      adminId,
      action: "SUITEASD_SYNC",
      detail: `${source.mode}: ${upserted} società · ${source.detail}`,
    });
  }

  return { ...source, upserted };
}
