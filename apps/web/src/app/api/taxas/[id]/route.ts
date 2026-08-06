import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { usuarioEquipe } from "@/lib/sessao";
import { db } from "@/db";
import { taxasPagar } from "@/db/schema";
import { mimeTypePorExtensao } from "@/lib/upload";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const [taxa] = await db.select().from(taxasPagar).where(eq(taxasPagar.id, id)).limit(1);
  if (!taxa || !taxa.arquivoCaminho) {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./data/uploads";
  const caminhoCompleto = path.join(uploadsDir, taxa.arquivoCaminho);
  const inline = new URL(req.url).searchParams.get("inline") === "1";

  const bytes = await readFile(caminhoCompleto);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${taxa.descricao}.pdf"`,
      "Content-Type": mimeTypePorExtensao(taxa.arquivoCaminho),
    },
  });
}
