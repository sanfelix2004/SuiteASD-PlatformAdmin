import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { FIELD_GROUPS } from "@/lib/fields";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  sport: z.string().default("VOLLEY"),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  fiscalCode: z.string().max(32).optional().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED", "PENDING", "CHURNED"]).default("PENDING"),
  billingPlan: z.enum(["PILOTA", "SQUADRA", "SOCIETA"]).default("PILOTA"),
  billingExempt: z.boolean().default(true),
  billingExemptReason: z.string().max(500).optional().nullable(),
  annualFeeCents: z.number().int().min(0).max(1_000_000_00).default(0),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const exempt = searchParams.get("exempt");

  const societies = await prisma.societyAccount.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { slug: { contains: q } },
                { city: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : {},
        status ? { status } : {},
        exempt === "true"
          ? { billingExempt: true }
          : exempt === "false"
            ? { billingExempt: false }
            : {},
      ],
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ data: societies });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dati non validi", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const society = await prisma.societyAccount.create({
      data: {
        ...parsed.data,
        email: parsed.data.email ?? null,
        phone: parsed.data.phone ?? null,
        city: parsed.data.city ?? null,
        fiscalCode: parsed.data.fiscalCode ?? null,
        billingExemptReason: parsed.data.billingExemptReason ?? null,
        notes: parsed.data.notes ?? null,
        fieldAccess: {
          create: FIELD_GROUPS.map((group) => ({
            fieldGroup: group.key,
            canView: group.canViewDefault,
            canEdit: group.canEditDefault,
          })),
        },
      },
    });
    await writeAudit({
      adminId: session.id,
      societyId: society.id,
      action: "SOCIETY_CREATE",
      detail: society.slug,
    });
    return NextResponse.json(society, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Slug già in uso" }, { status: 409 });
  }
}
