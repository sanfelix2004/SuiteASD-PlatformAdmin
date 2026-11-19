import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { FIELD_GROUPS } from "@/lib/fields";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const policies = await prisma.visibilityPolicy.findMany({ orderBy: { fieldGroup: "asc" } });
  return NextResponse.json({ data: policies });
}

const patchSchema = z.object({
  fieldGroup: z.enum(FIELD_GROUPS.map((g) => g.key) as [string, ...string[]]),
  canViewDefault: z.boolean(),
  canEditDefault: z.boolean(),
});

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  }
  const canEditDefault = parsed.data.canViewDefault ? parsed.data.canEditDefault : false;
  const policy = await prisma.visibilityPolicy.update({
    where: { fieldGroup: parsed.data.fieldGroup },
    data: {
      canViewDefault: parsed.data.canViewDefault,
      canEditDefault,
    },
  });
  await writeAudit({
    adminId: session.id,
    action: "POLICY_UPDATE",
    detail: `${policy.fieldGroup} view=${policy.canViewDefault} edit=${policy.canEditDefault}`,
  });
  return NextResponse.json(policy);
}
