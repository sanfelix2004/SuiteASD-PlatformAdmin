import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { assertSameOrigin } from "@/lib/csrf";
import { createProfile } from "@/lib/profiles";
import { clientKey, takeRateLimit } from "@/lib/rate-limit";
import { findAdminByEmail, upsertAdmin, writeAudit } from "@/lib/store";
import { syncFromSuiteAsdSafe } from "@/lib/suiteasd";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(200),
  name: z.string().trim().min(2).max(80),
  profileName: z.string().trim().min(2).max(40).optional(),
});

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const limited = takeRateLimit(clientKey(request, "register"), 8, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Troppi tentativi. Riprova tra poco." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  await ensureBootstrapped();
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Nome, email e password (min. 12) obbligatori" },
      { status: 422 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (await findAdminByEmail(email)) {
    return NextResponse.json({ error: "Email già registrata" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const userId = await upsertAdmin({
    email,
    name: parsed.data.name,
    passwordHash,
  });

  const profile = await createProfile({
    userId,
    name: parsed.data.profileName?.trim() || parsed.data.name,
  });

  await writeAudit({
    adminId: userId,
    action: "REGISTER",
    detail: email,
  });

  // Best-effort SuiteASD sync for new accounts; never block register.
  await syncFromSuiteAsdSafe(userId);

  await createSession({
    id: userId,
    email,
    name: parsed.data.name,
    // No profile selected yet → Netflix picker
    profileId: null,
    profileName: null,
  });

  return NextResponse.json(
    { ok: true, userId, profileId: profile?.id },
    { status: 201 },
  );
}
