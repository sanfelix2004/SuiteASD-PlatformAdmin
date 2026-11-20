import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadSuiteAsdSocieties } from "@/lib/suiteasd";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const source = await loadSuiteAsdSocieties();
  return NextResponse.json({
    mode: source.mode,
    detail: source.detail,
    count: source.societies.length,
    societies: source.societies.map((row) => ({
      externalId: row.externalId,
      name: row.name,
      slug: row.slug,
      membersCount: row.membersCount,
      teamsCount: row.teamsCount,
      city: row.city,
    })),
  });
}
