"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { modelosDocumento, documentosGerados, processos, obraFotos, clientes } from "@/db/schema";
import { renderDocx, type ImagemDocx } from "@/lib/docx/document";
import { reclassificarProcesso } from "@/lib/processos";
import { registrarNoChat } from "@/lib/chat-sistema";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

export async function gerarDocumento(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {  const modeloId = String(formData.get("modeloId") ?? "");
  const clienteId = String(formData.get("clienteId") ?? "");
  const embarcacaoId = String(formData.get("embarcacaoId") ?? "") || null;
  const obraId = String(formData.get("obraId") ?? "") || null;
  let processoId = String(formData.get("processoId") ?? "") || null;
  const valoresEcho = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!modeloId, "Modelo é obrigatório.")
    .exigir(!!clienteId, "Cliente é obrigatório.").erro;
  if (erro) return { erro, valores: valoresEcho };

  const [modelo] = await db
    .select()
    .from(modelosDocumento)
    .where(eq(modelosDocumento.id, modeloId))
    .limit(1);
  if (!modelo) return { erro: "Modelo não encontrado.", valores: valoresEcho };

  if (obraId && !processoId) {
    const [processoDaObra] = await db
      .select({ id: processos.id })
      .from(processos)
      .where(eq(processos.obraId, obraId))
      .limit(1);
    if (processoDaObra) {
      processoId = processoDaObra.id;
    } else if (modelo.servicoId) {
      const [novoProcesso] = await db
        .insert(processos)
        .values({ clienteId, servicoId: modelo.servicoId, obraId })
        .returning({ id: processos.id });
      processoId = novoProcesso.id;
    }
  }

  const valores: Record<string, string> = {};
  for (const campo of modelo.campos) {
    valores[campo] = String(formData.get(`campo_${campo}`) ?? "");
  }

  // O Memorial Descritivo leva as fotos da obra antes das assinaturas (mín. 3).
  const imagens: ImagemDocx[] = [];
  if (obraId && /memorial/i.test(modelo.nome)) {
    const fotos = await db
      .select({ caminho: obraFotos.caminho })
      .from(obraFotos)
      .where(eq(obraFotos.obraId, obraId))
      .orderBy(obraFotos.criadoEm);
    for (const foto of fotos.slice(0, 6)) {
      try {
        const bytes = await readFile(path.join(uploadsDir(), foto.caminho));
        imagens.push({ buffer: bytes, extensao: path.extname(foto.caminho).replace(".", "") || "png" });
      } catch {
        // foto ilegível no disco — segue sem ela, sem quebrar a geração
      }
    }
  }

  const modeloBuffer = await readFile(path.join(uploadsDir(), modelo.arquivoCaminho));
  const docxBuffer = await renderDocx(modeloBuffer, valores, { imagens });

  const geradosDir = path.join(uploadsDir(), "gerados");
  await mkdir(geradosDir, { recursive: true });
  const docxNome = `${randomUUID()}.docx`;
  const docxCaminho = path.join("gerados", docxNome);
  await writeFile(path.join(uploadsDir(), docxCaminho), docxBuffer);

  let pdfCaminho: string | null = null;
  try {
    const gotenbergUrl = process.env.GOTENBERG_URL ?? "http://gotenberg:3000";
    const body = new FormData();
    body.append(
      "files",
      new Blob([new Uint8Array(docxBuffer)], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      "documento.docx"
    );
    const res = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
      method: "POST",
      body,
    });
    if (res.ok) {
      const pdfBuffer = Buffer.from(await res.arrayBuffer());
      const pdfNome = `${randomUUID()}.pdf`;
      pdfCaminho = path.join("gerados", pdfNome);
      await writeFile(path.join(uploadsDir(), pdfCaminho), pdfBuffer);
    }
  } catch {
    // Gotenberg indisponível — o DOCX gerado continua utilizável sem o PDF.
  }

  let vencimento: string | null = null;
  if (modelo.validadeMeses) {
    const data = new Date();
    data.setMonth(data.getMonth() + modelo.validadeMeses);
    vencimento = data.toISOString().slice(0, 10);
  }

  const [documento] = await db
    .insert(documentosGerados)
    .values({
      modeloId,
      clienteId,
      embarcacaoId,
      processoId,
      obraId,
      dadosPreenchidos: valores,
      docxCaminho,
      pdfCaminho,
      vencimento,
    })
    .returning({ id: documentosGerados.id });

  if (processoId) {
    await reclassificarProcesso(processoId);
    await registrarAuditoria("criar", "documento_gerado", documento.id, `${modelo.nome} — processo ${processoId}`);
    redirect(`/processos/${processoId}`);
  }

  const [clienteDoDocumento] = await db
    .select({ nome: clientes.nome })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);
  await registrarNoChat(
    `Documento "${modelo.nome}" gerado para ${clienteDoDocumento?.nome ?? "cliente"}.`
  );
  await registrarAuditoria("criar", "documento_gerado", documento.id, modelo.nome);

  redirect(`/documentos/${documento.id}`);
}

/**
 * Quando o Gotenberg cai no momento da geração, o documento fica só com o DOCX.
 * Esta action tenta gerar o PDF a partir do DOCX já salvo — para regenerar depois
 * sem precisar refazer o documento.
 */
export async function regenerarPdf(documentoId: string) {
  const [documento] = await db
    .select()
    .from(documentosGerados)
    .where(eq(documentosGerados.id, documentoId))
    .limit(1);
  if (!documento) throw new Error("Documento não encontrado");

  const docxBuffer = await readFile(path.join(uploadsDir(), documento.docxCaminho));

  const gotenbergUrl = process.env.GOTENBERG_URL ?? "http://gotenberg:3000";
  const body = new FormData();
  body.append(
    "files",
    new Blob([new Uint8Array(docxBuffer)], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    "documento.docx"
  );

  let pdfCaminho: string | null = null;
  try {
    const res = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
      method: "POST",
      body,
    });
    if (res.ok) {
      const pdfBuffer = Buffer.from(await res.arrayBuffer());
      const geradosDir = path.join(uploadsDir(), "gerados");
      await mkdir(geradosDir, { recursive: true });
      const pdfNome = `${randomUUID()}.pdf`;
      pdfCaminho = path.join("gerados", pdfNome);
      await writeFile(path.join(uploadsDir(), pdfCaminho), pdfBuffer);
    }
  } catch {
    // Gotenberg indisponível — o erro aparece na tela como redirect com ?erro=
  }

  if (!pdfCaminho) {
    redirect(`/documentos/${documentoId}?erro=Gotenberg não respondeu — tente novamente em instantes.`);
  }

  await db
    .update(documentosGerados)
    .set({ pdfCaminho })
    .where(eq(documentosGerados.id, documentoId));
  await registrarAuditoria("atualizar", "documento_gerado", documentoId, "PDF regenerado");

  redirect(`/documentos/${documentoId}`);
}
