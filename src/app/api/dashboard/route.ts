import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dashboardTotals } from "@/lib/store";
import { loadSuiteAsdSocieties } from "@/lib/suiteasd";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const data = await dashboardTotals();
  const source = await loadSuiteAsdSocieties();
  return NextResponse.json({
    totals: {
      societies: data.totals.societies,
      active: data.totals.active,
      suspended: data.totals.suspended,
      pending: data.totals.pending,
      billingExempt: data.totals.billing_exempt,
      potentialRevenueCents: data.totals.potential_revenue_cents,
      members: data.totals.members,
      teams: data.totals.teams,
    },
    recent: data.recent,
    suiteasd: {
      mode: source.mode,
      detail: source.detail,
      count: source.societies.length,
    },
  });
}
