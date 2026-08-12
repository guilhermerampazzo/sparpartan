"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pipelineOportunidades, pipelineHistorico } from "@/db/schema";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";
import { registrarAuditoria } from "@/lib/audit";
import { auth } from "@/lib/auth";

async function usuarioAtualId(): Promise<string | null> {
  const session = await auth();
  const usuarioSessao = session?.user as { id?: string; tipo?: string } | undefined;
  return usuarioSessao?.tipo === "equipe" ? (usuarioSessao.id ?? null) : null;
}

function camposDoForm(formData: FormData) {
  return {
    titulo: String(formData.get("titulo") ?? "").trim(),
    clienteId: String(formData.get("clienteId") ?? "") || null,
    telefoneContato: String(formData.get("telefoneContato") ?? "").trim() || null,
    origem: String(formData.get("origem") ?? "").trim() || null,
    servicoSolicitado: String(formData.get("servicoSolicitado") ?? "").trim() || null,
    valorEstimado: String(formData.get("valorEstimado") ?? "") || null,
    orcamentoId: String(formData.get("orcamentoId") ?? "") || null,
    responsavelId: String(formData.get("responsavelId") ?? "") || null,
    ultimoContato: String(formData.get("ultimoContato") ?? "").trim(),
    proximaAcao: String(formData.get("proximaAcao") ?? "").trim() || null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

export async function criarOportunidade(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const campos = camposDoForm(formData);
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!campos.titulo, "Informe o título da oportunidade.")
    .exigir(!!campos.clienteId || !!campos.telefoneContato, "Vincule um cliente ou informe um telefone de contato.")
    .erro;

  if (erro) return { erro, valores };

  const criadoPorId = await usuarioAtualId();

  const [oportunidade] = await db
    .insert(pipelineOportunidades)
    .values({
      titulo: campos.titulo,
      clienteId: campos.clienteId,
      telefoneContato: campos.telefoneContato,
      origem: campos.origem,
      servicoSolicitado: campos.servicoSolicitado,
      valorEstimado: campos.valorEstimado,
      orcamentoId: campos.orcamentoId,
      responsavelId: campos.responsavelId || criadoPorId,
      ultimoContatoEm: campos.ultimoContato ? new Date(`${campos.ultimoContato}T00:00:00`) : null,
      proximaAcao: campos.proximaAcao,
      observacoes: campos.observacoes,
      criadoPorId,
    })
    .returning({ id: pipelineOportunidades.id });

  await db.insert(pipelineHistorico).values({
    oportunidadeId: oportunidade.id,
    estagioAnterior: null,
    estagioNovo: "novo_lead",
    usuarioId: criadoPorId,
  });

  await registrarAuditoria("criar", "oportunidade", oportunidade.id, campos.titulo);
  redirect(`/pipeline/${oportunidade.id}`);
}

export async function atualizarOportunidade(
  oportunidadeId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const campos = camposDoForm(formData);
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!campos.titulo, "Informe o título da oportunidade.")
    .exigir(!!campos.clienteId || !!campos.telefoneContato, "Vincule um cliente ou informe um telefone de contato.")
    .erro;

  if (erro) return { erro, valores };

  await db
    .update(pipelineOportunidades)
    .set({
      titulo: campos.titulo,
      clienteId: campos.clienteId,
      telefoneContato: campos.telefoneContato,
      origem: campos.origem,
      servicoSolicitado: campos.servicoSolicitado,
      valorEstimado: campos.valorEstimado,
      orcamentoId: campos.orcamentoId,
      responsavelId: campos.responsavelId || null,
      ultimoContatoEm: campos.ultimoContato ? new Date(`${campos.ultimoContato}T00:00:00`) : null,
      proximaAcao: campos.proximaAcao,
      observacoes: campos.observacoes,
      atualizadoEm: new Date(),
    })
    .where(eq(pipelineOportunidades.id, oportunidadeId));

  await registrarAuditoria("atualizar", "oportunidade", oportunidadeId, campos.titulo);
  redirect(`/pipeline/${oportunidadeId}`);
}

const ESTAGIOS = [
  "novo_lead",
  "primeiro_contato",
  "aguardando_documentacao",
  "orcamento_enviado",
  "negociacao",
  "aguardando_pagamento",
  "servico_contratado",
  "em_execucao",
  "pos_venda",
  "concluido",
  "perdido",
] as const;
type PipelineEstagio = (typeof ESTAGIOS)[number];
const ESTAGIOS_VALIDOS = new Set<string>(ESTAGIOS);

function comoEstagio(valor: string): PipelineEstagio {
  return valor as PipelineEstagio;
}

export async function moverEstagio(
  oportunidadeId: string,
  novoEstagio: string,
  motivoPerda?: string
) {
  if (!ESTAGIOS_VALIDOS.has(novoEstagio)) throw new Error("Estágio inválido.");

  const [atual] = await db
    .select({ estagio: pipelineOportunidades.estagio })
    .from(pipelineOportunidades)
    .where(eq(pipelineOportunidades.id, oportunidadeId))
    .limit(1);
  if (!atual) throw new Error("Oportunidade não encontrada.");

  const usuarioId = await usuarioAtualId();

  await db
    .update(pipelineOportunidades)
    .set({
      estagio: comoEstagio(novoEstagio),
      motivoPerda: novoEstagio === "perdido" ? (motivoPerda?.trim() || null) : null,
      atualizadoEm: new Date(),
    })
    .where(eq(pipelineOportunidades.id, oportunidadeId));

  await db.insert(pipelineHistorico).values({
    oportunidadeId,
    estagioAnterior: atual.estagio,
    estagioNovo: comoEstagio(novoEstagio),
    usuarioId,
  });

  await registrarAuditoria(
    "alterar_status",
    "oportunidade",
    oportunidadeId,
    `${atual.estagio} → ${novoEstagio}`
  );
  redirect(`/pipeline/${oportunidadeId}`);
}

export async function moverEstagioNoQuadro(formData: FormData) {
  const oportunidadeId = String(formData.get("oportunidadeId") ?? "");
  const novoEstagio = String(formData.get("novoEstagio") ?? "");
  if (!oportunidadeId || !ESTAGIOS_VALIDOS.has(novoEstagio)) throw new Error("Dados inválidos.");

  const [atual] = await db
    .select({ estagio: pipelineOportunidades.estagio })
    .from(pipelineOportunidades)
    .where(eq(pipelineOportunidades.id, oportunidadeId))
    .limit(1);
  if (!atual) throw new Error("Oportunidade não encontrada.");

  const usuarioId = await usuarioAtualId();

  await db
    .update(pipelineOportunidades)
    .set({
      estagio: comoEstagio(novoEstagio),
      atualizadoEm: new Date(),
    })
    .where(eq(pipelineOportunidades.id, oportunidadeId));

  await db.insert(pipelineHistorico).values({
    oportunidadeId,
    estagioAnterior: atual.estagio,
    estagioNovo: comoEstagio(novoEstagio),
    usuarioId,
  });

  await registrarAuditoria(
    "alterar_status",
    "oportunidade",
    oportunidadeId,
    `${atual.estagio} → ${novoEstagio} (quadro)`
  );
  redirect("/pipeline");
}

export async function marcarPerdida(oportunidadeId: string, formData: FormData) {
  const motivoPerda = String(formData.get("motivoPerda") ?? "").trim();
  await moverEstagio(oportunidadeId, "perdido", motivoPerda);
}
