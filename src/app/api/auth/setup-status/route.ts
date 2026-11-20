import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/bootstrap";

export async function GET() {
  try {
    const configured = await isAdminConfigured();
    const authSecretReady = (process.env.AUTH_SECRET?.trim().length ?? 0) >= 32;
    return NextResponse.json({
      configured,
      authSecretReady,
      bootstrapReady:
        (process.env.PLATFORM_BOOTSTRAP_PASSWORD?.trim().length ?? 0) >= 12,
    });
  } catch {
    return NextResponse.json({
      configured: false,
      authSecretReady: false,
      bootstrapReady: false,
    });
  }
}
