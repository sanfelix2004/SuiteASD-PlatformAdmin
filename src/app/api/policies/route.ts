import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { FIELD_GROUPS } from "@/lib/fields";
import { listPolicies, updatePolicy, writeAudit } from "@/lib/store";
import { assertSameOrigin } from "@/lib/csrf";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const policies = await listPolicies();
  return NextResponse.json({
    data: policies.map((policy) => ({
      id: policy.id,
      fieldGroup: policy.field_group,
      labelIt: policy.label_it,
      descriptionIt: policy.description_it,
      canViewDefault: Boolean(policy.can_view_default),
      canEditDefault: Boolean(policy.can_edit_default),
      sensitive: Boolean(policy.sensitive),
    })),
  });
}

const patchSchema = z.object({
  fieldGroup: z.enum(FIELD_GROUPS.map((g) => g.key) as [string, ...string[]]),
  canViewDefault: z.boolean(),
  canEditDefault: z.boolean(),
});

export async function PATCH(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  const canEditDefault = parsed.data.canViewDefault ? parsed.data.canEditDefault : false;
  const policy = await updatePolicy(
    parsed.data.fieldGroup,
    parsed.data.canViewDefault,
    canEditDefault,
  );
  await writeAudit({
    adminId: session.id,
    action: "POLICY_UPDATE",
    detail: `${parsed.data.fieldGroup} view=${parsed.data.canViewDefault} edit=${canEditDefault}`,
  });
  return NextResponse.json(policy);
}
