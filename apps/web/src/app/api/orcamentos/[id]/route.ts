import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { usuarioEquipe } from "@/lib/sessao";
import { db } from "@/db";
import { orcamentos } from "@/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const [orcamento] = await db.select().from(orcamentos).where(eq(orcamentos.id, id)).limit(1);
  if (!orcamento?.pdfCaminho) {
    return NextResponse.json({ error: "PDF não disponível" }, { status: 404 });
  }

  const uploadsDir = process.env.UPLOADS_DIR ?? "./data/uploads";
  const bytes = await readFile(path.join(uploadsDir, orcamento.pdfCaminho));

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Disposition": `attachment; filename="orcamento-${orcamento.numero}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
