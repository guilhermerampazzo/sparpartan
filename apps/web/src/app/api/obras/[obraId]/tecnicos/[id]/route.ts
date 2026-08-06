import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { usuarioEquipe } from "@/lib/sessao";
import { db } from "@/db";
import { obrasDocumentosTecnicos } from "@/db/schema";
import { mimeTypePorExtensao } from "@/lib/upload";

export async function GET(_req: Request, { params }: { params: Promise<{ obraId: string; id: string }> }) {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { obraId, id } = await params;
  const [doc] = await db
    .select()
    .from(obrasDocumentosTecnicos)
    .where(and(eq(obrasDocumentosTecnicos.id, id), eq(obrasDocumentosTecnicos.obraId, obraId)))
    .limit(1);
  if (!doc?.arquivoCaminho) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./data/uploads";
  const caminhoCompleto = path.join(uploadsDir, doc.arquivoCaminho);
  const mimeType = mimeTypePorExtensao(doc.arquivoCaminho);

  const bytes = await readFile(caminhoCompleto);
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": mimeType },
  });
}
