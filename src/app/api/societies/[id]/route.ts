import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    city: z.string().max(80).nullable().optional(),
    fiscalCode: z.string().max(32).nullable().optional(),
    status: z.enum(["ACTIVE", "SUSPENDED", "PENDING", "CHURNED"]).optional(),
    billingPlan: z.enum(["PILOTA", "SQUADRA", "SOCIETA"]).optional(),
    billingExempt: z.boolean().optional(),
    billingExemptReason: z.string().max(500).nullable().optional(),
    billingExemptUntil: z.string().datetime().nullable().optional(),
    annualFeeCents: z.number().int().min(0).max(1_000_000_00).optional(),
    membersCount: z.number().int().min(0).optional(),
    teamsCount: z.number().int().min(0).optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Nessun campo" });

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const society = await prisma.societyAccount.findUnique({
    where: { id },
    include: {
      fieldAccess: { orderBy: { fieldGroup: "asc" } },
      metrics: { orderBy: { capturedAt: "desc" }, take: 12 },
      societyNotes: { orderBy: { createdAt: "desc" }, take: 20 },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!society) return NextResponse.json({ error: "Società non trovata" }, { status: 404 });

  const policies = await prisma.visibilityPolicy.findMany({ orderBy: { fieldGroup: "asc" } });
  return NextResponse.json({ society, policies });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  }

  const existing = await prisma.societyAccount.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Società non trovata" }, { status: 404 });

  const data = {
    ...parsed.data,
    billingExemptUntil:
      parsed.data.billingExemptUntil === undefined
        ? undefined
        : parsed.data.billingExemptUntil === null
          ? null
          : new Date(parsed.data.billingExemptUntil),
  };

  const society = await prisma.societyAccount.update({ where: { id }, data });
  await writeAudit({
    adminId: session.id,
    societyId: id,
    action: "SOCIETY_UPDATE",
    detail: JSON.stringify(parsed.data),
  });
  return NextResponse.json(society);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.societyAccount.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Società non trovata" }, { status: 404 });
  await prisma.societyAccount.delete({ where: { id } });
  await writeAudit({
    adminId: session.id,
    action: "SOCIETY_DELETE",
    detail: existing.slug,
  });
  return new NextResponse(null, { status: 204 });
}
