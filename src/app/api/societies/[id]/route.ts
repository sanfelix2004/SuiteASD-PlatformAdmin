import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { deleteSociety, getSociety, updateSociety, writeAudit } from "@/lib/store";

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
    annualFeeCents: z.number().int().min(0).optional(),
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
  const data = await getSociety(id);
  if (!data) return NextResponse.json({ error: "Società non trovata" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  const existing = await getSociety(id);
  if (!existing) return NextResponse.json({ error: "Società non trovata" }, { status: 404 });
  const updated = await updateSociety(id, parsed.data);
  await writeAudit({
    adminId: session.id,
    societyId: id,
    action: "SOCIETY_UPDATE",
    detail: JSON.stringify(parsed.data),
  });
  return NextResponse.json(updated?.society);
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const existing = await getSociety(id);
  if (!existing) return NextResponse.json({ error: "Società non trovata" }, { status: 404 });
  await deleteSociety(id);
  await writeAudit({
    adminId: session.id,
    action: "SOCIETY_DELETE",
    detail: existing.society.slug,
  });
  return new NextResponse(null, { status: 204 });
}
