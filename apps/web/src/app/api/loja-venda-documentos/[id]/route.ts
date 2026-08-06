import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { usuarioEquipe } from "@/lib/sessao";
import { db } from "@/db";
import { lojaVendaDocumentos } from "@/db/schema";
import { mimeTypePorExtensao } from "@/lib/upload";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const [documento] = await db
    .select()
    .from(lojaVendaDocumentos)
    .where(eq(lojaVendaDocumentos.id, id))
    .limit(1);
  if (!documento) {
    return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./data/uploads";
  const caminhoCompleto = path.join(uploadsDir, documento.caminho);
  const mimeType = mimeTypePorExtensao(documento.caminho);

  const bytes = await readFile(caminhoCompleto);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${documento.nomeOriginal}"`,
    },
  });
}
