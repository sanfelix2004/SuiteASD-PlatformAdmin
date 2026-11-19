import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi" }, { status: 422 });
  }
  const admin = await prisma.platformAdmin.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!admin || !(await verifyPassword(parsed.data.password, admin.passwordHash))) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }
  await createSession({ id: admin.id, email: admin.email, name: admin.name });
  await writeAudit({
    adminId: admin.id,
    action: "LOGIN",
    detail: admin.email,
  });
  return NextResponse.json({ id: admin.id, email: admin.email, name: admin.name });
}
