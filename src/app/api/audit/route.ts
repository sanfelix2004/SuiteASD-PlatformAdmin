import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listAudit } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const rows = await listAudit();
  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      action: row.action,
      detail: row.detail,
      createdAt: row.created_at,
      admin: row.admin_email
        ? { email: row.admin_email, name: row.admin_name ?? "" }
        : null,
      society: row.society_slug
        ? { name: row.society_name ?? "", slug: row.society_slug }
        : null,
    })),
  });
}
