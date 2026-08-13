import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createReadStream } from "node:fs";
import path from "node:path";
import { stat } from "node:fs/promises";
import { db } from "@/db";
import { empresaMarinheiros } from "@/db/schema";
import { uploadsDir } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [marinheiro] = await db.select().from(empresaMarinheiros).where(eq(empresaMarinheiros.id, id)).limit(1);
  if (!marinheiro?.habilitacaoCaminho) return NextResponse.json({ erro: "Arquivo não encontrado" }, { status: 404 });

  const caminho = path.join(uploadsDir(), marinheiro.habilitacaoCaminho);
  const info = await stat(caminho).catch(() => null);
  if (!info) return NextResponse.json({ erro: "Arquivo ausente no disco" }, { status: 404 });

  const stream = createReadStream(caminho);
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(marinheiro.nome)}-habilitacao.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
