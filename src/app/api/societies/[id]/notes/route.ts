import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { addNote, getSociety, writeAudit } from "@/lib/store";

const schema = z.object({ body: z.string().trim().min(1).max(2000) });
type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Nota non valida" }, { status: 422 });
  const society = await getSociety(id);
  if (!society) return NextResponse.json({ error: "Società non trovata" }, { status: 404 });
  const note = await addNote(id, session.id, parsed.data.body);
  await writeAudit({ adminId: session.id, societyId: id, action: "NOTE_CREATE", detail: note.id });
  return NextResponse.json(note, { status: 201 });
}
