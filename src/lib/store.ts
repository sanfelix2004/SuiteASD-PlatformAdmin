import { FIELD_GROUPS } from "./fields";
import { newId, sql } from "./db";

export type AdminRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
};

export type SocietyRow = {
  id: string;
  name: string;
  slug: string;
  external_id: string | null;
  source: string;
  synced_at: string | Date | null;
  sport: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  fiscal_code: string | null;
  status: string;
  billing_plan: string;
  billing_exempt: boolean;
  billing_exempt_reason: string | null;
  billing_exempt_until: string | Date | null;
  annual_fee_cents: number;
  members_count: number;
  teams_count: number;
  last_active_at: string | Date | null;
  onboarded_at: string | Date;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export function mapSociety(row: SocietyRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    externalId: row.external_id,
    source: row.source,
    syncedAt: row.synced_at,
    sport: row.sport,
    email: row.email,
    phone: row.phone,
    city: row.city,
    fiscalCode: row.fiscal_code,
    status: row.status,
    billingPlan: row.billing_plan,
    billingExempt: Boolean(row.billing_exempt),
    billingExemptReason: row.billing_exempt_reason,
    billingExemptUntil: row.billing_exempt_until,
    annualFeeCents: Number(row.annual_fee_cents),
    membersCount: Number(row.members_count),
    teamsCount: Number(row.teams_count),
    lastActiveAt: row.last_active_at,
    onboardedAt: row.onboarded_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function countAdmins() {
  const rows = await sql<{ count: number }>(
    `select count(*)::int as count from platform_admin`,
  );
  return Number(rows[0]?.count ?? 0);
}

export async function findAdminByEmail(email: string) {
  const rows = await sql<AdminRow>(
    `select id, email, password_hash, name from platform_admin where email = $1 limit 1`,
    [email.toLowerCase()],
  );
  return rows[0] ?? null;
}

export async function findAdminById(id: string) {
  const rows = await sql<AdminRow>(
    `select id, email, password_hash, name from platform_admin where id = $1 limit 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function upsertAdmin(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  const existing = await findAdminByEmail(input.email);
  if (existing) {
    await sql(
      `update platform_admin set name = $2, password_hash = $3, updated_at = NOW() where id = $1`,
      [existing.id, input.name, input.passwordHash],
    );
    return existing.id;
  }
  const id = newId();
  await sql(
    `insert into platform_admin (id, email, password_hash, name) values ($1,$2,$3,$4)`,
    [id, input.email.toLowerCase(), input.passwordHash, input.name],
  );
  return id;
}

export async function writeAudit(input: {
  adminId?: string | null;
  societyId?: string | null;
  action: string;
  detail?: string | null;
}) {
  await sql(
    `insert into audit_log (id, admin_id, society_id, action, detail) values ($1,$2,$3,$4,$5)`,
    [newId(), input.adminId ?? null, input.societyId ?? null, input.action, input.detail ?? null],
  );
}

export async function ensurePolicies() {
  for (const group of FIELD_GROUPS) {
    await sql(
      `insert into visibility_policy
        (id, field_group, label_it, description_it, can_view_default, can_edit_default, sensitive)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (field_group) do update set
         label_it = excluded.label_it,
         description_it = excluded.description_it,
         can_view_default = excluded.can_view_default,
         can_edit_default = excluded.can_edit_default,
         sensitive = excluded.sensitive`,
      [
        newId(),
        group.key,
        group.labelIt,
        group.descriptionIt,
        group.canViewDefault,
        group.canEditDefault,
        group.sensitive,
      ],
    );
  }
}

export async function listPolicies() {
  return sql<{
    id: string;
    field_group: string;
    label_it: string;
    description_it: string;
    can_view_default: boolean;
    can_edit_default: boolean;
    sensitive: boolean;
  }>(`select * from visibility_policy order by field_group asc`);
}

export async function updatePolicy(
  fieldGroup: string,
  canViewDefault: boolean,
  canEditDefault: boolean,
) {
  const rows = await sql(
    `update visibility_policy
     set can_view_default = $2, can_edit_default = $3
     where field_group = $1
     returning *`,
    [fieldGroup, canViewDefault, canEditDefault],
  );
  return rows[0] ?? null;
}

export async function dashboardTotals() {
  const [totals] = await sql<{
    societies: number;
    active: number;
    suspended: number;
    pending: number;
    billing_exempt: number;
    potential_revenue_cents: number;
    members: number;
    teams: number;
  }>(`
    select
      count(*)::int as societies,
      count(*) filter (where status = 'ACTIVE')::int as active,
      count(*) filter (where status = 'SUSPENDED')::int as suspended,
      count(*) filter (where status = 'PENDING')::int as pending,
      count(*) filter (where billing_exempt = true)::int as billing_exempt,
      coalesce(sum(annual_fee_cents) filter (where billing_exempt = false and status = 'ACTIVE'), 0)::int as potential_revenue_cents,
      coalesce(sum(members_count), 0)::int as members,
      coalesce(sum(teams_count), 0)::int as teams
    from society_account
  `);
  const recent = await sql<SocietyRow>(
    `select * from society_account order by updated_at desc limit 8`,
  );
  return { totals, recent: recent.map(mapSociety) };
}

export async function listSocieties(filters: {
  q?: string;
  status?: string;
  exempt?: string;
}) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.q?.trim()) {
    params.push(`%${filters.q.trim()}%`);
    clauses.push(
      `(name ilike $${params.length} or slug ilike $${params.length} or coalesce(city,'') ilike $${params.length} or coalesce(email,'') ilike $${params.length})`,
    );
  }
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }
  if (filters.exempt === "true") clauses.push(`billing_exempt = true`);
  if (filters.exempt === "false") clauses.push(`billing_exempt = false`);
  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const rows = await sql<SocietyRow>(
    `select * from society_account ${where} order by status asc, name asc`,
    params,
  );
  return rows.map(mapSociety);
}

export async function createSociety(input: {
  name: string;
  slug: string;
  sport?: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  fiscalCode?: string | null;
  status?: string;
  billingPlan?: string;
  billingExempt?: boolean;
  billingExemptReason?: string | null;
  annualFeeCents?: number;
  notes?: string | null;
  externalId?: string | null;
  source?: string;
}) {
  const id = newId();
  const policies = await listPolicies();
  await sql(
    `insert into society_account
      (id, name, slug, external_id, source, sport, email, phone, city, fiscal_code, status,
       billing_plan, billing_exempt, billing_exempt_reason, annual_fee_cents, notes, synced_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      id,
      input.name,
      input.slug,
      input.externalId ?? null,
      input.source ?? "LOCAL",
      input.sport ?? "VOLLEY",
      input.email ?? null,
      input.phone ?? null,
      input.city ?? null,
      input.fiscalCode ?? null,
      input.status ?? "PENDING",
      input.billingPlan ?? "PILOTA",
      input.billingExempt ?? true,
      input.billingExemptReason ?? null,
      input.annualFeeCents ?? 0,
      input.notes ?? null,
      input.source === "SUITEASD" ? new Date().toISOString() : null,
    ],
  );
  for (const policy of policies) {
    await sql(
      `insert into society_field_access (id, society_id, field_group, can_view, can_edit)
       values ($1,$2,$3,$4,$5)`,
      [
        newId(),
        id,
        policy.field_group,
        policy.can_view_default,
        policy.can_edit_default,
      ],
    );
  }
  return getSociety(id);
}

export async function getSociety(id: string) {
  const rows = await sql<SocietyRow>(`select * from society_account where id = $1`, [id]);
  if (!rows[0]) return null;
  const society = mapSociety(rows[0]);
  const fieldAccess = await sql<{
    field_group: string;
    can_view: boolean;
    can_edit: boolean;
  }>(
    `select field_group, can_view, can_edit from society_field_access where society_id = $1 order by field_group`,
    [id],
  );
  const metrics = await sql<{
    id: string;
    captured_at: string;
    active_users_7d: number;
    logins_7d: number;
    documents_count: number;
    payments_cents: number;
    events_count: number;
  }>(
    `select * from metric_snapshot where society_id = $1 order by captured_at desc limit 12`,
    [id],
  );
  const societyNotes = await sql<{ id: string; body: string; created_at: string }>(
    `select id, body, created_at from society_note where society_id = $1 order by created_at desc limit 20`,
    [id],
  );
  const auditLogs = await sql<{
    id: string;
    action: string;
    detail: string | null;
    created_at: string;
  }>(
    `select id, action, detail, created_at from audit_log where society_id = $1 order by created_at desc limit 30`,
    [id],
  );
  const policies = await listPolicies();
  return {
    society: {
      ...society,
      fieldAccess: fieldAccess.map((row) => ({
        fieldGroup: row.field_group,
        canView: Boolean(row.can_view),
        canEdit: Boolean(row.can_edit),
      })),
      metrics: metrics.map((row) => ({
        id: row.id,
        capturedAt: row.captured_at,
        activeUsers7d: Number(row.active_users_7d),
        logins7d: Number(row.logins_7d),
        documentsCount: Number(row.documents_count),
        paymentsCents: Number(row.payments_cents),
        eventsCount: Number(row.events_count),
      })),
      societyNotes: societyNotes.map((row) => ({
        id: row.id,
        body: row.body,
        createdAt: row.created_at,
      })),
      auditLogs: auditLogs.map((row) => ({
        id: row.id,
        action: row.action,
        detail: row.detail,
        createdAt: row.created_at,
      })),
    },
    policies: policies.map((policy) => ({
      id: policy.id,
      fieldGroup: policy.field_group,
      labelIt: policy.label_it,
      descriptionIt: policy.description_it,
      canViewDefault: Boolean(policy.can_view_default),
      canEditDefault: Boolean(policy.can_edit_default),
      sensitive: Boolean(policy.sensitive),
    })),
  };
}

export async function updateSociety(
  id: string,
  patch: Record<string, unknown>,
) {
  const mapping: Record<string, string> = {
    name: "name",
    email: "email",
    phone: "phone",
    city: "city",
    fiscalCode: "fiscal_code",
    status: "status",
    billingPlan: "billing_plan",
    billingExempt: "billing_exempt",
    billingExemptReason: "billing_exempt_reason",
    billingExemptUntil: "billing_exempt_until",
    annualFeeCents: "annual_fee_cents",
    membersCount: "members_count",
    teamsCount: "teams_count",
    notes: "notes",
    externalId: "external_id",
    source: "source",
    syncedAt: "synced_at",
    sport: "sport",
    slug: "slug",
  };
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, column] of Object.entries(mapping)) {
    if (key in patch) {
      params.push(patch[key]);
      sets.push(`${column} = $${params.length}`);
    }
  }
  if (!sets.length) return getSociety(id);
  params.push(id);
  await sql(
    `update society_account set ${sets.join(", ")}, updated_at = NOW() where id = $${params.length}`,
    params,
  );
  return getSociety(id);
}

export async function deleteSociety(id: string) {
  await sql(`delete from society_account where id = $1`, [id]);
}

export async function upsertFieldAccess(
  societyId: string,
  fieldGroup: string,
  canView: boolean,
  canEdit: boolean,
) {
  await sql(
    `insert into society_field_access (id, society_id, field_group, can_view, can_edit)
     values ($1,$2,$3,$4,$5)
     on conflict (society_id, field_group)
     do update set can_view = excluded.can_view, can_edit = excluded.can_edit`,
    [newId(), societyId, fieldGroup, canView, canEdit],
  );
}

export async function addNote(societyId: string, authorId: string, body: string) {
  const id = newId();
  await sql(
    `insert into society_note (id, society_id, author_id, body) values ($1,$2,$3,$4)`,
    [id, societyId, authorId, body],
  );
  return { id, body, createdAt: new Date().toISOString() };
}

export async function addMetric(
  societyId: string,
  metric: {
    activeUsers7d: number;
    logins7d: number;
    documentsCount: number;
    paymentsCents: number;
    eventsCount: number;
  },
) {
  await sql(
    `insert into metric_snapshot
      (id, society_id, active_users_7d, logins_7d, documents_count, payments_cents, events_count)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      newId(),
      societyId,
      metric.activeUsers7d,
      metric.logins7d,
      metric.documentsCount,
      metric.paymentsCents,
      metric.eventsCount,
    ],
  );
}

export async function findSocietyByExternalOrSlug(externalId: string, slug: string) {
  const rows = await sql<SocietyRow>(
    `select * from society_account where external_id = $1 or slug = $2 limit 1`,
    [externalId, slug],
  );
  return rows[0] ? mapSociety(rows[0]) : null;
}

export async function deleteUnlinkedLocalSocieties() {
  await sql(
    `delete from society_account where source = 'LOCAL' or external_id is null`,
  );
}

export async function listAudit() {
  return sql<{
    id: string;
    action: string;
    detail: string | null;
    created_at: string;
    admin_name: string | null;
    admin_email: string | null;
    society_name: string | null;
    society_slug: string | null;
  }>(`
    select a.id, a.action, a.detail, a.created_at,
           p.name as admin_name, p.email as admin_email,
           s.name as society_name, s.slug as society_slug
    from audit_log a
    left join platform_admin p on p.id = a.admin_id
    left join society_account s on s.id = a.society_id
    order by a.created_at desc
    limit 100
  `);
}
