import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { usuarioEquipe } from "@/lib/sessao";
import { db } from "@/db";
import { arquivos } from "@/db/schema";
import { mimeTypePorExtensao } from "@/lib/upload";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const [arquivo] = await db.select().from(arquivos).where(eq(arquivos.id, id)).limit(1);
  if (!arquivo) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./data/uploads";
  const caminhoCompleto = path.join(uploadsDir, arquivo.caminho);

  const inline = new URL(req.url).searchParams.get("inline") === "1";
  const mimeType = mimeTypePorExtensao(arquivo.nomeOriginal);

  const bytes = await readFile(caminhoCompleto);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${arquivo.nomeOriginal}"`,
      "Content-Type": inline ? mimeType : "application/octet-stream",
    },
  });
}
