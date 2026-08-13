import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createReadStream } from "node:fs";
import path from "node:path";
import { stat } from "node:fs/promises";
import { db } from "@/db";
import { lojaOrcamentos } from "@/db/schema";
import { uploadsDir } from "@/lib/storage";
import { gerarPdfOrcamentoLoja } from "@/lib/loja-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [orcamento] = await db.select().from(lojaOrcamentos).where(eq(lojaOrcamentos.id, id)).limit(1);
  if (!orcamento) return NextResponse.json({ erro: "Orçamento não encontrado" }, { status: 404 });

  let pdfCaminho = `loja/orcamentos/${orcamento.numero}.pdf`;
  const infoExistente = await stat(path.join(uploadsDir(), pdfCaminho)).catch(() => null);
  if (!infoExistente) {
    try {
      const gerado = await gerarPdfOrcamentoLoja(id);
      pdfCaminho = gerado.pdfCaminho;
    } catch (e) {
      return NextResponse.json({ erro: e instanceof Error ? e.message : "Falha ao gerar PDF" }, { status: 500 });
    }
  }

  const caminho = path.join(uploadsDir(), pdfCaminho);
  const info = await stat(caminho).catch(() => null);
  if (!info) return NextResponse.json({ erro: "PDF ausente" }, { status: 404 });

  const stream = createReadStream(caminho);
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${orcamento.numero}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
