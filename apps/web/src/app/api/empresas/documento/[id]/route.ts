import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createReadStream } from "node:fs";
import path from "node:path";
import { stat } from "node:fs/promises";
import { db } from "@/db";
import { empresaDocumentos } from "@/db/schema";
import { uploadsDir } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [doc] = await db.select().from(empresaDocumentos).where(eq(empresaDocumentos.id, id)).limit(1);
  if (!doc?.caminho) return NextResponse.json({ erro: "Documento não encontrado" }, { status: 404 });

  const caminho = path.join(uploadsDir(), doc.caminho);
  const info = await stat(caminho).catch(() => null);
  if (!info) return NextResponse.json({ erro: "Arquivo ausente no disco" }, { status: 404 });

  const stream = createReadStream(caminho);
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.titulo ?? "documento")}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
