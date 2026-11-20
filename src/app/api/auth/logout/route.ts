import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { writeAudit } from "@/lib/store";

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await getSession();
  await clearSession();
  if (session) await writeAudit({ adminId: session.id, action: "LOGOUT" });
  return NextResponse.json({ ok: true });
}
