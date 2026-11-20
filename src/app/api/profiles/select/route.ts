import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, selectProfile } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { writeAudit } from "@/lib/store";

const bodySchema = z.object({
  profileId: z.string().min(1),
});

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Profilo non valido" }, { status: 422 });
  }
  try {
    const profile = await selectProfile(session.id, parsed.data.profileId);
    await writeAudit({
      adminId: session.id,
      action: "PROFILE_SELECT",
      detail: profile.name,
    });
    return NextResponse.json({ ok: true, profile });
  } catch {
    return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
  }
}
