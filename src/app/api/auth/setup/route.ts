import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/lib/auth";
import { createFirstAdmin, isAdminConfigured } from "@/lib/bootstrap";
import { assertSameOrigin } from "@/lib/csrf";
import { clientKey, takeRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(200),
  name: z.string().trim().min(2).max(80).optional(),
});

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const limited = takeRateLimit(clientKey(request, "setup"), 5, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Troppi tentativi. Riprova tra poco." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  if (await isAdminConfigured()) {
    return NextResponse.json({ error: "Setup già completato" }, { status: 409 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Password almeno 12 caratteri ed email valida" },
      { status: 422 },
    );
  }

  try {
    const adminId = await createFirstAdmin(parsed.data);
    await createSession({
      id: adminId,
      email: parsed.data.email.trim().toLowerCase(),
      name: parsed.data.name?.trim() || "Operatore piattaforma",
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "already_configured") {
      return NextResponse.json({ error: "Setup già completato" }, { status: 409 });
    }
    return NextResponse.json({ error: "Setup non riuscito" }, { status: 500 });
  }
}
