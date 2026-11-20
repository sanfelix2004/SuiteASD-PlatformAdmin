import { NextResponse } from "next/server";

/** Reject cross-site cookie-authenticated mutations. */
export function assertSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Same-origin navigations / some clients omit Origin; allow when Host matches Referer.
    const referer = request.headers.get("referer");
    if (!referer) return null;
    try {
      const refHost = new URL(referer).host;
      const reqHost = request.headers.get("host");
      if (reqHost && refHost === reqHost) return null;
    } catch {
      /* fall through */
    }
    return NextResponse.json({ error: "Origin non valida" }, { status: 403 });
  }

  try {
    const originHost = new URL(origin).host;
    const reqHost = request.headers.get("host");
    if (!reqHost || originHost !== reqHost) {
      return NextResponse.json({ error: "Origin non valida" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Origin non valida" }, { status: 403 });
  }
  return null;
}
