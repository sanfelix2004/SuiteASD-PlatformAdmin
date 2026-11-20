import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { findAdminById, getSetting, setSetting } from "./store";

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

  // No shipped fallback: persist a random secret in the app database on first use.
  let stored = await getSetting(SETTING_KEY);
  if (!stored || stored.length < 32) {
    stored = randomBytes(48).toString("base64url");
    await setSetting(SETTING_KEY, stored);
  }
  cachedSecret = new TextEncoder().encode(stored);
  return cachedSecret;
}

export type SessionAdmin = { id: string; email: string; name: string };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(admin: SessionAdmin) {
  const token = await new SignJWT({
    sub: admin.id,
    email: admin.email,
    name: admin.name,
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
    return { id: admin.id, email: admin.email, name: admin.name };
  } catch {
    return null;
  }
}
