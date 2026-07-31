import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mensagens } from "@/db/schema";
import { mimeTypePorExtensao } from "@/lib/upload";
import { uploadsDir } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const [mensagem] = await db.select().from(mensagens).where(eq(mensagens.id, id)).limit(1);
  if (!mensagem || !mensagem.anexoCaminho) {
    return NextResponse.json({ error: "Anexo não encontrado" }, { status: 404 });
  }

  const caminhoCompleto = path.join(uploadsDir(), mensagem.anexoCaminho);
  const mimeType = mimeTypePorExtensao(mensagem.anexoCaminho);

  const bytes = await readFile(caminhoCompleto);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `inline; filename="${mensagem.anexoNome ?? "anexo"}"`,
    },
  });
}
