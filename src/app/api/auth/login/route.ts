import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, verifyPassword } from "@/lib/auth";
import { ensureBootstrapped, isAdminConfigured } from "@/lib/bootstrap";
import { assertSameOrigin } from "@/lib/csrf";
import { clientKey, takeRateLimit } from "@/lib/rate-limit";
import { findAdminByEmail, writeAudit } from "@/lib/store";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const limited = takeRateLimit(clientKey(request, "login"), 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Troppi tentativi. Riprova tra poco." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  await ensureBootstrapped();

  if (!(await isAdminConfigured())) {
    return NextResponse.json(
      { error: "Completa prima il setup iniziale." },
      { status: 503 },
    );
  }

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
