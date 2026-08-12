"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clientes, embarcacoes, arquivos, lembretes, solicitacoes } from "@/db/schema";
import { buscarSolicitacaoValida, marcarConcluida } from "@/lib/solicitacoes";
import { aprovarOrcamentoCore, recusarOrcamentoCore } from "@/lib/orcamentos";
import { reclassificarProcesso } from "@/lib/processos";
import { validarArquivo } from "@/lib/upload";
import { registrarAuditoria } from "@/lib/audit";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

async function salvarArquivo(subpasta: string, arquivo: File) {
  const erro = validarArquivo(arquivo);
  if (erro) throw new Error(erro);

  const dir = path.join(uploadsDir(), subpasta);
  await mkdir(dir, { recursive: true });
  const extensao = path.extname(arquivo.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(dir, nomeArquivo), bytes);
  return path.join(subpasta, nomeArquivo);
}

async function notificarEquipe(mensagem: string, referenciaTipo: string, referenciaId: string) {
  await db.insert(lembretes).values({
    mensagem,
    dataLembrete: new Date().toISOString().slice(0, 10),
    origem: "cliente_solicitacao",
    referenciaTipo,
    referenciaId,
  });
}

async function validarOuFalhar(token: string) {
  const { solicitacao, expirada } = await buscarSolicitacaoValida(token);
  if (!solicitacao) throw new Error("Link inválido");
  if (expirada) throw new Error("Link expirado");
  if (solicitacao.status === "concluida") throw new Error("Este link já foi utilizado");
  return solicitacao;
}

/** Nome do cliente para o rastro de auditoria quando a ação vem do link público. */
async function nomeCliente(solicitacaoId: string): Promise<string | undefined> {
  const [solicitacao] = await db
    .select({ clienteId: solicitacoes.clienteId })
    .from(solicitacoes)
    .where(eq(solicitacoes.id, solicitacaoId))
    .limit(1);
  if (!solicitacao?.clienteId) return undefined;
  const [cliente] = await db
    .select({ nome: clientes.nome })
    .from(clientes)
    .where(eq(clientes.id, solicitacao.clienteId))
    .limit(1);
  return cliente?.nome;
}

export async function concluirCadastroCliente(token: string, formData: FormData) {
  const solicitacao = await validarOuFalhar(token);

  const nome = String(formData.get("nome") ?? "").trim();
  const cpfCnpj = String(formData.get("cpfCnpj") ?? "").trim();
  if (!nome || !cpfCnpj) throw new Error("Nome e CPF/CNPJ são obrigatórios");

  const dadosCliente = {
    nome,
    tipo: String(formData.get("tipo") ?? "pessoa_fisica") as "pessoa_fisica" | "pessoa_juridica",
    cpfCnpj,
    email: String(formData.get("email") ?? "") || null,
    telefone: String(formData.get("telefone") ?? "") || null,
    celular: String(formData.get("celular") ?? "") || null,
    cep: String(formData.get("cep") ?? "") || null,
    rua: String(formData.get("rua") ?? "") || null,
    numero: String(formData.get("numero") ?? "") || null,
    complemento: String(formData.get("complemento") ?? "") || null,
    bairro: String(formData.get("bairro") ?? "") || null,
    cidade: String(formData.get("cidade") ?? "") || null,
    uf: String(formData.get("uf") ?? "") || null,
  };

  let clienteId = solicitacao.clienteId;
  if (clienteId) {
    await db.update(clientes).set(dadosCliente).where(eq(clientes.id, clienteId));
  } else {
    const [novo] = await db.insert(clientes).values(dadosCliente).returning({ id: clientes.id });
    clienteId = novo.id;
  }

  const documentos = formData.getAll("documentos") as File[];
  for (const doc of documentos) {
    if (!doc || doc.size === 0) continue;
    const caminho = await salvarArquivo(`clientes/${clienteId}`, doc);
    await db.insert(arquivos).values({
      clienteId,
      tipo: "documento_cadastro",
      nomeOriginal: doc.name,
      caminho,
    });
  }

  await db.update(solicitacoes).set({ clienteId }).where(eq(solicitacoes.id, solicitacao.id));
  await marcarConcluida(solicitacao.id);
  await notificarEquipe(`${nome} preencheu o cadastro pelo link.`, "cliente", clienteId);
  await registrarAuditoria(
    "criar",
    "cadastro_cliente_link",
    clienteId,
    `cadastro preenchido pelo link (${cpfCnpj})`,
    nome
  );

  revalidatePath(`/c/${token}`);
}

export async function enviarDocumentoRequisito(
  token: string,
  requisitoId: string,
  formData: FormData
) {
  const solicitacao = await validarOuFalhar(token);
  if (!solicitacao.clienteId || !solicitacao.processoId) {
    throw new Error("Solicitação sem cliente/processo vinculado");
  }

  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione um arquivo");

  const caminho = await salvarArquivo(`clientes/${solicitacao.clienteId}`, arquivo);
  await db.insert(arquivos).values({
    clienteId: solicitacao.clienteId,
    processoId: solicitacao.processoId,
    requisitoId,
    tipo: "documento_processo",
    nomeOriginal: arquivo.name,
    caminho,
  });

  await reclassificarProcesso(solicitacao.processoId);
  await registrarAuditoria(
    "criar",
    "documento_processo",
    solicitacao.processoId,
    `documento enviado pelo link: ${arquivo.name}`,
    await nomeCliente(solicitacao.id)
  );

  revalidatePath(`/c/${token}`);
}

export async function concluirDocumentosProcesso(token: string) {
  const solicitacao = await validarOuFalhar(token);
  await marcarConcluida(solicitacao.id);
  if (solicitacao.processoId) {
    await notificarEquipe("Cliente enviou os documentos pendentes pelo link.", "processo", solicitacao.processoId);
    await registrarAuditoria(
      "alterar_status",
      "solicitacao",
      solicitacao.id,
      `documentos do processo ${solicitacao.processoId} concluídos pelo link`,
      await nomeCliente(solicitacao.id)
    );
  }
  revalidatePath(`/c/${token}`);
}

export async function concluirCadastroEmbarcacao(token: string, formData: FormData) {
  const solicitacao = await validarOuFalhar(token);
  if (!solicitacao.clienteId) throw new Error("Solicitação sem cliente vinculado");

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Nome da embarcação é obrigatório");

  const [embarcacao] = await db
    .insert(embarcacoes)
    .values({
      clienteId: solicitacao.clienteId,
      nome,
      tipo: String(formData.get("tipo") ?? "") || null,
      numeroInscricao: String(formData.get("numeroInscricao") ?? "") || null,
      ano: Number(formData.get("ano")) || null,
      comprimento: String(formData.get("comprimento") ?? "") || null,
      numeroCasco: String(formData.get("numeroCasco") ?? "") || null,
      materialCasco: String(formData.get("materialCasco") ?? "") || null,
      construtor: String(formData.get("construtor") ?? "") || null,
      cor: String(formData.get("cor") ?? "") || null,
    })
    .returning({ id: embarcacoes.id });

  const documento = formData.get("documento") as File | null;
  if (documento && documento.size > 0) {
    const caminho = await salvarArquivo(`clientes/${solicitacao.clienteId}`, documento);
    await db.insert(arquivos).values({
      clienteId: solicitacao.clienteId,
      tipo: "documento_embarcacao",
      nomeOriginal: documento.name,
      caminho,
    });
  }

  await marcarConcluida(solicitacao.id);
  await notificarEquipe(
    `Cliente cadastrou a embarcação "${nome}" pelo link.`,
    "embarcacao",
    embarcacao.id
  );
  await registrarAuditoria(
    "criar",
    "embarcacao",
    embarcacao.id,
    `cadastrada pelo link do cliente`,
    await nomeCliente(solicitacao.id)
  );

  revalidatePath(`/c/${token}`);
}

export async function aprovarOrcamentoPublico(token: string) {
  const solicitacao = await validarOuFalhar(token);
  if (!solicitacao.orcamentoId) throw new Error("Solicitação sem orçamento vinculado");

  const resultado = await aprovarOrcamentoCore(solicitacao.orcamentoId, await nomeCliente(solicitacao.id));
  if (!resultado.ok) throw new Error(`Não foi possível aprovar (${resultado.motivo})`);

  await marcarConcluida(solicitacao.id);
  await notificarEquipe("Cliente aprovou o orçamento pelo link.", "orcamento", solicitacao.orcamentoId);

  revalidatePath(`/c/${token}`);
}

export async function recusarOrcamentoPublico(token: string) {
  const solicitacao = await validarOuFalhar(token);
  if (!solicitacao.orcamentoId) throw new Error("Solicitação sem orçamento vinculado");

  const resultado = await recusarOrcamentoCore(solicitacao.orcamentoId, await nomeCliente(solicitacao.id));
  if (!resultado.ok) throw new Error(`Não foi possível recusar (${resultado.motivo})`);

  await marcarConcluida(solicitacao.id);
  await notificarEquipe("Cliente recusou o orçamento pelo link.", "orcamento", solicitacao.orcamentoId);

  revalidatePath(`/c/${token}`);
}
