"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import {
  empresas,
  empresaEmbarcacoes,
  empresaMarinheiros,
  empresaDocumentos,
  empresaManutencoes,
  empresaAlertas,
} from "@/db/schema";
import { salvarArquivoLocal, uploadsDir } from "@/lib/storage";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { atualizarAlertasEmpresa, resolverAlertasDoDocumento } from "@/lib/empresas";

// ---------------------------------------------------------------------------
// Empresa
// ---------------------------------------------------------------------------

export async function criarEmpresa(formData: FormData) {
  const razaoSocial = String(formData.get("razaoSocial") ?? "").trim();
  if (!razaoSocial) throw new Error("Informe a razão social.");

  const [criada] = await db
    .insert(empresas)
    .values({
      razaoSocial,
      nomeFantasia: String(formData.get("nomeFantasia") ?? "") || null,
      cnpj: String(formData.get("cnpj") ?? "") || null,
      inscricaoEstadual: String(formData.get("inscricaoEstadual") ?? "") || null,
      endereco: String(formData.get("endereco") ?? "") || null,
      telefone: String(formData.get("telefone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      responsavel: String(formData.get("responsavel") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      clienteId: String(formData.get("clienteId") ?? "") || null,
    })
    .returning({ id: empresas.id });

  await registrarAuditoria("criar", "empresa", criada.id, razaoSocial);
  redirect(`/gestao-empresas/${criada.id}`);
}

export async function atualizarEmpresa(id: string, formData: FormData) {
  await db
    .update(empresas)
    .set({
      razaoSocial: String(formData.get("razaoSocial") ?? "").trim(),
      nomeFantasia: String(formData.get("nomeFantasia") ?? "") || null,
      cnpj: String(formData.get("cnpj") ?? "") || null,
      inscricaoEstadual: String(formData.get("inscricaoEstadual") ?? "") || null,
      endereco: String(formData.get("endereco") ?? "") || null,
      telefone: String(formData.get("telefone") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      responsavel: String(formData.get("responsavel") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      status: (String(formData.get("status") ?? "ativa") as "ativa" | "inativa"),
    })
    .where(eq(empresas.id, id));
  await registrarAuditoria("atualizar", "empresa", id, "dados da empresa");
  revalidatePath(`/gestao-empresas/${id}`);
  redirect(`/gestao-empresas/${id}`);
}

export async function excluirEmpresa(id: string) {
  await db.delete(empresas).where(eq(empresas.id, id));
  await registrarAuditoria("excluir", "empresa", id, "empresa excluída");
  redirect("/gestao-empresas");
}

// ---------------------------------------------------------------------------
// Embarcações da empresa
// ---------------------------------------------------------------------------

export async function criarEmbarcacaoEmpresa(empresaId: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Informe o nome da embarcação.");

  await db.insert(empresaEmbarcacoes).values({
    empresaId,
    nome,
    numeroInscricao: String(formData.get("numeroInscricao") ?? "") || null,
    tipo: String(formData.get("tipo") ?? "") || null,
    atividade: String(formData.get("atividade") ?? "") || null,
    anoFabricacao: String(formData.get("anoFabricacao") ?? "") || null,
    motor: String(formData.get("motor") ?? "") || null,
    numeroSerie: String(formData.get("numeroSerie") ?? "") || null,
    observacoes: String(formData.get("observacoes") ?? "") || null,
  });
  await registrarAuditoria("criar", "empresa_embarcacao", empresaId, nome);
  revalidatePath(`/gestao-empresas/${empresaId}`);
}

export async function excluirEmbarcacaoEmpresa(empresaId: string, id: string) {
  await db.delete(empresaEmbarcacoes).where(eq(empresaEmbarcacoes.id, id));
  await registrarAuditoria("excluir", "empresa_embarcacao", id, "embarcação excluída");
  revalidatePath(`/gestao-empresas/${empresaId}`);
}

// ---------------------------------------------------------------------------
// Marinheiros
// ---------------------------------------------------------------------------

export async function criarMarinheiroEmpresa(empresaId: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Informe o nome do marinheiro.");

  let habilitacaoCaminho: string | null = null;
  const arquivo = formData.get("habilitacao") as File | null;
  if (arquivo && arquivo.size > 0) {
    habilitacaoCaminho = await salvarArquivoLocal(arquivo, "empresas", "documento");
  }

  await db.insert(empresaMarinheiros).values({
    empresaId,
    nome,
    cpf: String(formData.get("cpf") ?? "") || null,
    funcao: String(formData.get("funcao") ?? "") || null,
    numeroHabilitacao: String(formData.get("numeroHabilitacao") ?? "") || null,
    categoria: String(formData.get("categoria") ?? "") || null,
    dataEmissao: String(formData.get("dataEmissao") ?? "") || null,
    dataValidade: String(formData.get("dataValidade") ?? "") || null,
    habilitacaoCaminho,
    observacoes: String(formData.get("observacoes") ?? "") || null,
  });
  await registrarAuditoria("criar", "empresa_marinheiro", empresaId, nome);
  revalidatePath(`/gestao-empresas/${empresaId}`);
}

export async function excluirMarinheiroEmpresa(empresaId: string, id: string) {
  await db.delete(empresaMarinheiros).where(eq(empresaMarinheiros.id, id));
  await registrarAuditoria("excluir", "empresa_marinheiro", id, "marinheiro excluído");
  revalidatePath(`/gestao-empresas/${empresaId}`);
}

// ---------------------------------------------------------------------------
// Documentos (com leitura de PDF e substituição com histórico)
// ---------------------------------------------------------------------------

export async function criarDocumentoEmpresa(empresaId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "outro").trim();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const arquivo = formData.get("arquivo") as File | null;

  let caminho: string | null = null;
  if (arquivo && arquivo.size > 0) {
    caminho = await salvarArquivoLocal(arquivo, "empresas", "documento");
  }

  const [criado] = await db
    .insert(empresaDocumentos)
    .values({
      empresaId,
      embarcacaoId: String(formData.get("embarcacaoId") ?? "") || null,
      tipo,
      titulo: titulo || null,
      numero: String(formData.get("numero") ?? "") || null,
      dataEmissao: String(formData.get("dataEmissao") ?? "") || null,
      dataVencimento: String(formData.get("dataVencimento") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      caminho,
      criadoPorId: await idUsuarioEquipe(),
    })
    .returning({ id: empresaDocumentos.id });

  await atualizarAlertasEmpresa(empresaId);
  await registrarAuditoria("criar", "empresa_documento", criado.id, `${tipo}: ${titulo} — ${empresaId}`);
  revalidatePath(`/gestao-empresas/${empresaId}`);
  redirect(`/gestao-empresas/${empresaId}#documentos`);
}

/** Substitui o documento (novo anexo) mantendo o histórico — o antigo vira "substituído". */
export async function substituirDocumentoEmpresa(empresaId: string, documentoId: string, formData: FormData) {
  const [antigo] = await db.select().from(empresaDocumentos).where(eq(empresaDocumentos.id, documentoId)).limit(1);
  if (!antigo) throw new Error("Documento não encontrado");

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione o novo arquivo.");

  const caminho = await salvarArquivoLocal(arquivo, "empresas", "documento");
  if (antigo.caminho) {
    try {
      await unlink(path.join(uploadsDir(), antigo.caminho));
    } catch {
      // ok
    }
  }

  // O antigo permanece no banco (histórico), marcado como substituído.
  await db.update(empresaDocumentos).set({ substituidoPorId: null }).where(eq(empresaDocumentos.id, documentoId));

  const [novo] = await db
    .insert(empresaDocumentos)
    .values({
      empresaId,
      embarcacaoId: antigo.embarcacaoId,
      tipo: antigo.tipo,
      titulo: antigo.titulo,
      numero: antigo.numero,
      dataEmissao: antigo.dataEmissao,
      dataVencimento: String(formData.get("dataVencimento") ?? "") || antigo.dataVencimento,
      observacoes: antigo.observacoes,
      caminho,
      criadoPorId: await idUsuarioEquipe(),
    })
    .returning({ id: empresaDocumentos.id });

  await db.update(empresaDocumentos).set({ substituidoPorId: novo.id }).where(eq(empresaDocumentos.id, documentoId));
  await resolverAlertasDoDocumento(documentoId);
  await atualizarAlertasEmpresa(empresaId);
  await registrarAuditoria("atualizar", "empresa_documento", documentoId, `substituído por ${novo.id}`);
  revalidatePath(`/gestao-empresas/${empresaId}`);
  redirect(`/gestao-empresas/${empresaId}#documentos`);
}

/** Marca como regularizado (resolve alertas; o documento sai das listas de atenção). */
export async function marcarDocumentoRegularizado(empresaId: string, documentoId: string) {
  await db.update(empresaDocumentos).set({ regularizado: true }).where(eq(empresaDocumentos.id, documentoId));
  await resolverAlertasDoDocumento(documentoId);
  await atualizarAlertasEmpresa(empresaId);
  await registrarAuditoria("atualizar", "empresa_documento", documentoId, "marcado como regularizado");
  revalidatePath(`/gestao-empresas/${empresaId}`);
}

export async function excluirDocumentoEmpresa(empresaId: string, documentoId: string) {
  await db.delete(empresaDocumentos).where(eq(empresaDocumentos.id, documentoId));
  await atualizarAlertasEmpresa(empresaId);
  await registrarAuditoria("excluir", "empresa_documento", documentoId, "documento excluído");
  revalidatePath(`/gestao-empresas/${empresaId}`);
}

// ---------------------------------------------------------------------------
// Manutenções
// ---------------------------------------------------------------------------

export async function criarManutencaoEmpresa(empresaId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "manutencao").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  if (!descricao && !String(formData.get("dataRealizada") ?? "")) {
    throw new Error("Informe a descrição da manutenção.");
  }

  let caminho: string | null = null;
  const arquivo = formData.get("arquivo") as File | null;
  if (arquivo && arquivo.size > 0) {
    caminho = await salvarArquivoLocal(arquivo, "empresas", "documento");
  }

  await db.insert(empresaManutencoes).values({
    empresaId,
    embarcacaoId: String(formData.get("embarcacaoId") ?? "") || null,
    tipo,
    descricao: descricao || null,
    dataRealizada: String(formData.get("dataRealizada") ?? "") || null,
    horimetro: String(formData.get("horimetro") ?? "") || null,
    proximaManutencao: String(formData.get("proximaManutencao") ?? "") || null,
    proximaTrocaOleo: String(formData.get("proximaTrocaOleo") ?? "") || null,
    oleoUtilizado: String(formData.get("oleoUtilizado") ?? "") || null,
    responsavel: String(formData.get("responsavel") ?? "") || null,
    observacoes: String(formData.get("observacoes") ?? "") || null,
    caminho,
    criadoPorId: await idUsuarioEquipe(),
  });
  await atualizarAlertasEmpresa(empresaId);
  await registrarAuditoria("criar", "empresa_manutencao", empresaId, `${tipo}: ${descricao}`);
  revalidatePath(`/gestao-empresas/${empresaId}`);
}

export async function excluirManutencaoEmpresa(empresaId: string, id: string) {
  await db.delete(empresaManutencoes).where(eq(empresaManutencoes.id, id));
  await atualizarAlertasEmpresa(empresaId);
  await registrarAuditoria("excluir", "empresa_manutencao", id, "manutenção excluída");
  revalidatePath(`/gestao-empresas/${empresaId}`);
}

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export async function recalcularAlertasEmpresa(empresaId: string) {
  await atualizarAlertasEmpresa(empresaId);
  await registrarAuditoria("atualizar", "empresa", empresaId, "alertas recalculados");
  revalidatePath(`/gestao-empresas/${empresaId}`);
}

export async function resolverAlertaEmpresa(empresaId: string, alertaId: string) {
  await db.update(empresaAlertas).set({ resolvido: true }).where(eq(empresaAlertas.id, alertaId));
  revalidatePath(`/gestao-empresas/${empresaId}`);
}
