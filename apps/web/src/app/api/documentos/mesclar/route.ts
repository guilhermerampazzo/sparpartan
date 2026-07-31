import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { PDFDocument } from "pdf-lib";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { documentosGerados } from "@/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const formData = await req.formData();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length < 2) {
    return NextResponse.json({ error: "Selecione ao menos 2 documentos" }, { status: 400 });
  }

  const documentos = await db
    .select()
    .from(documentosGerados)
    .where(inArray(documentosGerados.id, ids));

  const tipoSessao = (session.user as { tipo?: string })?.tipo;
  if (tipoSessao === "cliente") {
    const foraDoCliente = documentos.some((doc) => doc.clienteId !== session.user?.id);
    if (foraDoCliente) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
  }

  const semPdf = documentos.some((doc) => !doc.pdfCaminho);
  if (semPdf || documentos.length !== ids.length) {
    return NextResponse.json({ error: "Um ou mais documentos não têm PDF disponível" }, { status: 400 });
  }

  const ordenados = ids
    .map((id) => documentos.find((doc) => doc.id === id))
    .filter((doc): doc is (typeof documentos)[number] => Boolean(doc));

  const uploadsDir = process.env.UPLOADS_DIR ?? "./data/uploads";
  const pdfFinal = await PDFDocument.create();

  for (const doc of ordenados) {
    const bytes = await readFile(path.join(uploadsDir, doc.pdfCaminho!));
    const pdfOrigem = await PDFDocument.load(bytes);
    const paginas = await pdfFinal.copyPages(pdfOrigem, pdfOrigem.getPageIndices());
    for (const pagina of paginas) pdfFinal.addPage(pagina);
  }

  const bytesFinais = await pdfFinal.save();

  return new NextResponse(new Uint8Array(bytesFinais), {
    headers: {
      "Content-Disposition": `attachment; filename="documentos-mesclados.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
