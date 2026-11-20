import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { findAdminByEmail, writeAudit } from "@/lib/store";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  await ensureBootstrapped();
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  }
  const admin = await findAdminByEmail(parsed.data.email);
  if (!admin || !(await verifyPassword(parsed.data.password, admin.password_hash))) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }
  await createSession({ id: admin.id, email: admin.email, name: admin.name });
  await writeAudit({ adminId: admin.id, action: "LOGIN", detail: admin.email });
  return NextResponse.json({ id: admin.id, email: admin.email, name: admin.name });
}
