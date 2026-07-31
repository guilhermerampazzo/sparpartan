import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { embarcacaoFotos } from "@/db/schema";
import { mimeTypePorExtensao } from "@/lib/upload";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const [foto] = await db.select().from(embarcacaoFotos).where(eq(embarcacaoFotos.id, id)).limit(1);
  if (!foto) {
    return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./data/uploads";
  const caminhoCompleto = path.join(uploadsDir, foto.caminho);
  const mimeType = mimeTypePorExtensao(foto.caminho);

  const bytes = await readFile(caminhoCompleto);
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": mimeType },
  });
}
