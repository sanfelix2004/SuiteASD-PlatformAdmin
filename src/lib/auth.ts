import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { findAdminById, getSetting, setSetting } from "./store";
import { getProfileForUser } from "./profiles";

const COOKIE = "spa_session";
const SETTING_KEY = "session_signing_secret";

let cachedSecret: Uint8Array | null = null;

async function resolveSecret(): Promise<Uint8Array> {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.AUTH_SECRET?.trim() ?? "";
  if (fromEnv.length >= 32) {
    cachedSecret = new TextEncoder().encode(fromEnv);
    return cachedSecret;
  }

  let stored = await getSetting(SETTING_KEY);
  if (!stored || stored.length < 32) {
    stored = randomBytes(48).toString("base64url");
    await setSetting(SETTING_KEY, stored);
  }
  cachedSecret = new TextEncoder().encode(stored);
  return cachedSecret;
}

export type SessionAdmin = {
  id: string;
  email: string;
  name: string;
  profileId?: string | null;
  profileName?: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

async function writeSessionCookie(payload: {
  sub: string;
  email: string;
  name: string;
  profileId?: string | null;
  profileName?: string | null;
}) {
  const token = await new SignJWT({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    profileId: payload.profileId ?? null,
    profileName: payload.profileName ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(await resolveSecret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function createSession(admin: SessionAdmin) {
  await writeSessionCookie({
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    profileId: admin.profileId ?? null,
    profileName: admin.profileName ?? null,
  });
}

export async function selectProfile(userId: string, profileId: string) {
  const admin = await findAdminById(userId);
  if (!admin) throw new Error("unauthorized");
  const profile = await getProfileForUser(profileId, userId);
  if (!profile) throw new Error("profile_not_found");
  await writeSessionCookie({
    sub: admin.id,
    email: admin.email,
    name: admin.name,
    profileId: profile.id,
    profileName: profile.name,
  });
  return profile;
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionAdmin | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await resolveSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    const admin = await findAdminById(payload.sub);
    if (!admin) return null;
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      profileId: typeof payload.profileId === "string" ? payload.profileId : null,
      profileName:
        typeof payload.profileName === "string" ? payload.profileName : null,
    };
  } catch {
    return null;
  }
}

/** Account logged in, but must pick a Netflix-style profile first. */
export async function requireAccountSession() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

/** Full access: account + selected profile. */
export async function requireProfileSession() {
  const session = await getSession();
  if (!session?.profileId) return null;
  return session;
}
