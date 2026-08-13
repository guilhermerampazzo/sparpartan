"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { arquivosEmpresa, embarcacoesSparapan, embarcacaoSparapanArquivos } from "@/db/schema";
import { salvarArquivoLocal } from "@/lib/storage";
import { uploadsDir } from "@/lib/storage";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

export async function criarArquivoEmpresa(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const arquivo = formData.get("arquivo") as File | null;
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!titulo, "Informe o título.")
    .exigir(!!categoria, "Selecione a categoria.")
    .exigir(!!arquivo && arquivo.size > 0, "Selecione um arquivo (PDF, JPG ou PNG).").erro;
  if (erro) return { erro, valores };

  let arquivoCaminho: string;
  try {
    arquivoCaminho = await salvarArquivoLocal(arquivo as File, "empresa", "documento");
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha ao salvar o arquivo.", valores };
  }

  const [registro] = await db
    .insert(arquivosEmpresa)
    .values({
      titulo,
      categoria,
      descricao: String(formData.get("descricao") ?? "") || null,
      arquivoCaminho,
    })
    .returning({ id: arquivosEmpresa.id });

  await registrarAuditoria("criar", "arquivo_empresa", registro.id, titulo);
  revalidatePath("/documentos-sparapan");
  return null;
}

export async function excluirArquivoEmpresa(id: string) {
  const [item] = await db.select().from(arquivosEmpresa).where(eq(arquivosEmpresa.id, id)).limit(1);
  if (!item) return;

  try {
    await unlink(path.join(uploadsDir(), item.arquivoCaminho));
  } catch {
    // Arquivo já ausente no disco não impede a exclusão do registro.
  }

  await db.delete(arquivosEmpresa).where(eq(arquivosEmpresa.id, id));
  await registrarAuditoria("excluir", "arquivo_empresa", id, item.titulo);
  revalidatePath("/documentos-sparapan");
}

/** Substitui o arquivo (novo PDF) mantendo título/descrição — histórico no log. */
export async function substituirArquivoEmpresa(id: string, formData: FormData) {
  const [item] = await db.select().from(arquivosEmpresa).where(eq(arquivosEmpresa.id, id)).limit(1);
  if (!item) throw new Error("Documento não encontrado");

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione o novo arquivo.");

  const novoCaminho = await salvarArquivoLocal(arquivo, "empresa", "documento");
  try {
    await unlink(path.join(uploadsDir(), item.arquivoCaminho));
  } catch {
    // arquivo antigo já ausente
  }

  await db.update(arquivosEmpresa).set({ arquivoCaminho: novoCaminho }).where(eq(arquivosEmpresa.id, id));
  await registrarAuditoria("atualizar", "arquivo_empresa", id, `documento substituído: ${item.titulo}`);
  revalidatePath("/documentos-sparapan");
}

// ---------------------------------------------------------------------------
// Embarcações Sparapan (ambiente 2)
// ---------------------------------------------------------------------------

export async function criarEmbarcacaoSparapan(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Informe o nome da embarcação.");

  const [criada] = await db
    .insert(embarcacoesSparapan)
    .values({
      nome,
      numeroInscricao: String(formData.get("numeroInscricao") ?? "") || null,
      tipo: String(formData.get("tipo") ?? "") || null,
      atividade: String(formData.get("atividade") ?? "") || null,
      anoFabricacao: String(formData.get("anoFabricacao") ?? "") || null,
      motor: String(formData.get("motor") ?? "") || null,
      numeroSerie: String(formData.get("numeroSerie") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
    })
    .returning({ id: embarcacoesSparapan.id });

  await registrarAuditoria("criar", "embarcacao_sparapan", criada.id, nome);
  revalidatePath("/documentos-sparapan");
  revalidatePath("/documentos-sparapan/embarcacoes");
  return criada.id;
}

export async function atualizarEmbarcacaoSparapan(id: string, formData: FormData) {
  await db
    .update(embarcacoesSparapan)
    .set({
      nome: String(formData.get("nome") ?? "").trim(),
      numeroInscricao: String(formData.get("numeroInscricao") ?? "") || null,
      tipo: String(formData.get("tipo") ?? "") || null,
      atividade: String(formData.get("atividade") ?? "") || null,
      anoFabricacao: String(formData.get("anoFabricacao") ?? "") || null,
      motor: String(formData.get("motor") ?? "") || null,
      numeroSerie: String(formData.get("numeroSerie") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
    })
    .where(eq(embarcacoesSparapan.id, id));
  await registrarAuditoria("atualizar", "embarcacao_sparapan", id, "dados da embarcação");
  revalidatePath("/documentos-sparapan/embarcacoes");
  revalidatePath(`/documentos-sparapan/embarcacoes/${id}`);
}

export async function excluirEmbarcacaoSparapan(id: string) {
  await db.delete(embarcacoesSparapan).where(eq(embarcacoesSparapan.id, id));
  await registrarAuditoria("excluir", "embarcacao_sparapan", id, "embarcação excluída");
  revalidatePath("/documentos-sparapan");
  revalidatePath("/documentos-sparapan/embarcacoes");
}

/** Adiciona arquivo na pasta da embarcação (documento, seguro, foto ou outro). */
export async function adicionarArquivoEmbarcacaoSparapan(embarcacaoId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "documento").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione o arquivo.");

  const caminho = await salvarArquivoLocal(arquivo, "empresa", "documento");
  await db.insert(embarcacaoSparapanArquivos).values({
    embarcacaoId,
    tipo,
    titulo: titulo || arquivo.name,
    caminho,
  });
  await registrarAuditoria(
    "criar",
    "embarcacao_sparapan_arquivo",
    embarcacaoId,
    `${tipo}: ${titulo || arquivo.name} (por ${await idUsuarioEquipe()})`
  );
  revalidatePath(`/documentos-sparapan/embarcacoes/${embarcacaoId}`);
}

export async function excluirArquivoEmbarcacaoSparapan(id: string) {
  const [item] = await db
    .select()
    .from(embarcacaoSparapanArquivos)
    .where(eq(embarcacaoSparapanArquivos.id, id))
    .limit(1);
  if (!item) return;
  try {
    await unlink(path.join(uploadsDir(), item.caminho));
  } catch {
    // ok
  }
  await db.delete(embarcacaoSparapanArquivos).where(eq(embarcacaoSparapanArquivos.id, id));
  await registrarAuditoria("excluir", "embarcacao_sparapan_arquivo", id, item.titulo);
  revalidatePath(`/documentos-sparapan/embarcacoes/${item.embarcacaoId}`);
}
