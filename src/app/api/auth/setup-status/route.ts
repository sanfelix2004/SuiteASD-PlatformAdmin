import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/bootstrap";

export async function GET() {
  try {
    const configured = await isAdminConfigured();
    return NextResponse.json({
      configured,
      needsSetup: !configured,
    });
  } catch {
    return NextResponse.json({ configured: false, needsSetup: true });
  }
}
