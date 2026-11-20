import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createSociety, listSocieties, writeAudit } from "@/lib/store";
import { assertSameOrigin } from "@/lib/csrf";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  sport: z.string().default("VOLLEY"),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  fiscalCode: z.string().max(32).optional().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING", "CHURNED"]).default("PENDING"),
  billingPlan: z.enum(["PILOTA", "SQUADRA", "SOCIETA"]).default("PILOTA"),
  billingExempt: z.boolean().default(true),
  billingExemptReason: z.string().max(500).optional().nullable(),
  annualFeeCents: z.number().int().min(0).default(0),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const data = await listSocieties({
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    exempt: searchParams.get("exempt") ?? undefined,
  });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  }
  try {
    const created = await createSociety(parsed.data);
    await writeAudit({
      adminId: session.id,
      societyId: created?.society.id,
      action: "SOCIETY_CREATE",
      detail: parsed.data.slug,
    });
    return NextResponse.json(created?.society, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Slug già in uso" }, { status: 409 });
  }
}
