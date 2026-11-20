import { NextResponse } from "next/server";

/** Kept for compatibility; registration is always open. */
export async function GET() {
  return NextResponse.json({
    configured: true,
    needsSetup: false,
    registrationOpen: true,
  });
}
