import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { AVATAR_COLORS, createProfile, listProfilesForUser } from "@/lib/profiles";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const profiles = await listProfilesForUser(session.id);
  return NextResponse.json({
    data: profiles,
    colors: AVATAR_COLORS,
    accountName: session.name,
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(40),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Nome profilo non valido" }, { status: 422 });
  }
  const existing = await listProfilesForUser(session.id);
  if (existing.length >= 8) {
    return NextResponse.json({ error: "Massimo 8 profili" }, { status: 400 });
  }
  const profile = await createProfile({
    userId: session.id,
    name: parsed.data.name,
    avatarColor: parsed.data.avatarColor,
  });
  return NextResponse.json(profile, { status: 201 });
}
