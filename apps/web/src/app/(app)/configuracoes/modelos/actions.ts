"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { modelosDocumento } from "@/db/schema";
import { extractFieldsFromDocx } from "@/lib/docx/document";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";
import { validarArquivo } from "@/lib/upload";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

export async function importarModelo(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const arquivo = formData.get("arquivo") as File | null;
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome do modelo.")
    .exigir(!!arquivo && arquivo.size > 0, "Selecione o arquivo .docx.").erro;
  if (erro) return { erro, valores };

  const erroArquivo = validarArquivo(arquivo!);
  if (erroArquivo) return { erro: erroArquivo, valores };

  const bytes = Buffer.from(await arquivo!.arrayBuffer());
  const campos = await extractFieldsFromDocx(bytes);

  const modelosDir = path.join(uploadsDir(), "modelos");
  await mkdir(modelosDir, { recursive: true });
  const nomeArquivo = `${randomUUID()}.docx`;
  await writeFile(path.join(modelosDir, nomeArquivo), bytes);

  const [modelo] = await db
    .insert(modelosDocumento)
    .values({
      nome,
      categoria: String(formData.get("categoria") ?? "") || null,
      norma: String(formData.get("norma") ?? "") || null,
      servicoId: String(formData.get("servicoId") ?? "") || null,
      arquivoCaminho: path.join("modelos", nomeArquivo),
      campos,
      obrigatorio: formData.get("obrigatorio") === "on",
      duasVias: formData.get("duasVias") === "on",
      validadeMeses: Number(formData.get("validadeMeses")) || null,
      padraoParaObra: formData.get("padraoParaObra") === "on",
    })
    .returning({ id: modelosDocumento.id });

  await registrarAuditoria("criar", "modelo_documento", modelo.id, `${nome} (${campos.length} campos)`);
  redirect("/configuracoes/modelos");
}

/**
 * Renomeia um modelo e, opcionalmente, substitui o arquivo .docx original
 * (uso: quando a NORMAM muda e o formulário da Marinha é atualizado).
 */
export async function atualizarModelo(
  modeloId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const arquivo = formData.get("arquivo") as File | null;
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!nome, "Informe o nome do modelo.").erro;
  if (erro) return { erro, valores };

  const dadosParaAtualizar: {
    nome: string;
    arquivoCaminho?: string;
    campos?: string[];
  } = { nome };

  if (arquivo && arquivo.size > 0) {
    const erroArquivo = validarArquivo(arquivo);
    if (erroArquivo) return { erro: erroArquivo, valores };

    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const campos = await extractFieldsFromDocx(bytes);

    const modelosDir = path.join(uploadsDir(), "modelos");
    await mkdir(modelosDir, { recursive: true });
    const nomeArquivo = `${randomUUID()}.docx`;
    await writeFile(path.join(modelosDir, nomeArquivo), bytes);

    dadosParaAtualizar.arquivoCaminho = path.join("modelos", nomeArquivo);
    dadosParaAtualizar.campos = campos;
  }

  await db.update(modelosDocumento).set(dadosParaAtualizar).where(eq(modelosDocumento.id, modeloId));

  await registrarAuditoria(
    "atualizar",
    "modelo_documento",
    modeloId,
    dadosParaAtualizar.arquivoCaminho ? `${nome} (arquivo substituído)` : nome
  );
  redirect("/configuracoes/modelos");
}

/**
 * Salva quais MERGEFIELDs do modelo devem ser marcados automaticamente (ex:
 * "X") quando o documento é gerado para um dos serviços selecionados —
 * cobre requerimentos com várias opções/finalidades no mesmo formulário.
 */
export async function atualizarCamposMarcacao(modeloId: string, formData: FormData) {
  const linhas = Number(formData.get("linhas") ?? 0);
  const camposMarcacao: { campo: string; valorMarcado: string; servicoIds: string[] }[] = [];

  for (let i = 0; i < linhas; i++) {
    const campo = String(formData.get(`campo_${i}`) ?? "").trim();
    if (!campo) continue;
    const valorMarcado = String(formData.get(`valor_${i}`) ?? "X").trim() || "X";
    const servicoIds = formData.getAll(`servicos_${i}`).map(String);
    if (servicoIds.length === 0) continue;
    camposMarcacao.push({ campo, valorMarcado, servicoIds });
  }

  await db.update(modelosDocumento).set({ camposMarcacao }).where(eq(modelosDocumento.id, modeloId));

  await registrarAuditoria(
    "atualizar",
    "modelo_documento",
    modeloId,
    `campos de marcação: ${camposMarcacao.length} regra(s)`
  );
  redirect(`/configuracoes/modelos/${modeloId}/editar`);
}
