import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { deleteProfile } from "@/lib/profiles";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  try {
    await deleteProfile(id, session.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "last_profile") {
      return NextResponse.json(
        { error: "Deve restare almeno un profilo" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Eliminazione non riuscita" }, { status: 500 });
  }
}
