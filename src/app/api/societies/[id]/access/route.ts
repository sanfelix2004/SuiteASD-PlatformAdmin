import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { FIELD_GROUPS } from "@/lib/fields";
import { getSociety, upsertFieldAccess, writeAudit } from "@/lib/store";

const schema = z.object({
  fieldGroup: z.enum(FIELD_GROUPS.map((g) => g.key) as [string, ...string[]]),
  canView: z.boolean(),
  canEdit: z.boolean(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  const society = await getSociety(id);
  if (!society) return NextResponse.json({ error: "Società non trovata" }, { status: 404 });
  const canEdit = parsed.data.canView ? parsed.data.canEdit : false;
  await upsertFieldAccess(id, parsed.data.fieldGroup, parsed.data.canView, canEdit);
  await writeAudit({
    adminId: session.id,
    societyId: id,
    action: "FIELD_ACCESS_UPDATE",
    detail: `${parsed.data.fieldGroup} view=${parsed.data.canView} edit=${canEdit}`,
  });
  return NextResponse.json({ ok: true });
}
