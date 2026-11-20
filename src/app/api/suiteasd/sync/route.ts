import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncFromSuiteAsd } from "@/lib/suiteasd";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const result = await syncFromSuiteAsd(session.id);
  if (result.mode === "unavailable") {
    return NextResponse.json(
      { error: "Fonte SuiteASD non disponibile", detail: result.detail },
      { status: 503 },
    );
  }
  return NextResponse.json({
    ok: true,
    mode: result.mode,
    detail: result.detail,
    upserted: result.upserted,
    count: result.societies.length,
  });
}
