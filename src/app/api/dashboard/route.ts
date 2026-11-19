import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });

  const [total, active, suspended, pending, exempt, billed, members, recent] =
    await Promise.all([
      prisma.societyAccount.count(),
      prisma.societyAccount.count({ where: { status: "ACTIVE" } }),
      prisma.societyAccount.count({ where: { status: "SUSPENDED" } }),
      prisma.societyAccount.count({ where: { status: "PENDING" } }),
      prisma.societyAccount.count({ where: { billingExempt: true } }),
      prisma.societyAccount.aggregate({
        _sum: { annualFeeCents: true },
        where: { billingExempt: false, status: "ACTIVE" },
      }),
      prisma.societyAccount.aggregate({ _sum: { membersCount: true, teamsCount: true } }),
      prisma.societyAccount.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          billingExempt: true,
          membersCount: true,
          city: true,
          updatedAt: true,
        },
      }),
    ]);

  return NextResponse.json({
    totals: {
      societies: total,
      active,
      suspended,
      pending,
      billingExempt: exempt,
      potentialRevenueCents: billed._sum.annualFeeCents ?? 0,
      members: members._sum.membersCount ?? 0,
      teams: members._sum.teamsCount ?? 0,
    },
    recent,
  });
}
