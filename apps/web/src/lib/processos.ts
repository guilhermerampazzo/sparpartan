import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  processos,
  modelosDocumento,
  documentosGerados,
  requisitosDocumento,
  arquivos,
} from "@/db/schema";

export type Pendencia = { tipo: "modelo" | "requisito"; nome: string };

/** Conexão (global `db`) ou transação do Drizzle — as funções abaixo aceitam ambas. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db;

export const STATUS_PROCESSO_VALIDOS = [
  "aberto",
  "documentos_pendentes",
  "pronto_para_protocolo",
  "protocolado",
  "aguardando_retorno_marinha",
  "concluido",
  "cancelado",
] as const;

/**
 * O que falta para o processo poder ser protocolado. Duas fontes:
 * - `modelosDocumento.obrigatorio` — documentos que o escritório gera;
 * - `requisitosDocumento` — documentos que o cliente precisa entregar (antes ignorados).
 */
export async function pendenciasDoProcesso(processoId: string, con: Tx = db): Promise<Pendencia[]> {
  const [processo] = await con.select().from(processos).where(eq(processos.id, processoId)).limit(1);
  if (!processo) return [];

  const modelosObrigatorios = await con
    .select()
    .from(modelosDocumento)
    .where(
      and(
        eq(modelosDocumento.servicoId, processo.servicoId),
        eq(modelosDocumento.ativo, true),
        eq(modelosDocumento.obrigatorio, true)
      )
    );

  const documentosDoProcesso = await con
    .select()
    .from(documentosGerados)
    .where(eq(documentosGerados.processoId, processoId));

  const requisitos = await con
    .select()
    .from(requisitosDocumento)
    .where(
      and(
        eq(requisitosDocumento.servicoId, processo.servicoId),
        eq(requisitosDocumento.ativo, true),
        eq(requisitosDocumento.obrigatorio, true)
      )
    );

  const enviados = await con.select().from(arquivos).where(eq(arquivos.processoId, processoId));

  const pendencias: Pendencia[] = [];

  for (const modelo of modelosObrigatorios) {
    if (!documentosDoProcesso.some((d) => d.modeloId === modelo.id)) {
      pendencias.push({ tipo: "modelo", nome: modelo.nome });
    }
  }

  for (const requisito of requisitos) {
    if (!enviados.some((a) => a.requisitoId === requisito.id)) {
      pendencias.push({ tipo: "requisito", nome: requisito.nome });
    }
  }

  return pendencias;
}

/**
 * Reclassifica o processo conforme o que falta. Antes o operador só descobria que
 * havia pendência ao tentar protocolar e levar um erro — e o status
 * `documentos_pendentes` nunca era escrito por ninguém.
 */
export async function reclassificarProcesso(processoId: string, con: Tx = db) {
  const [processo] = await con.select().from(processos).where(eq(processos.id, processoId)).limit(1);
  if (!processo) return;

  // Não mexe em processo já finalizado, protocolado ou aguardando retorno da Marinha.
  if (["protocolado", "aguardando_retorno_marinha", "concluido", "cancelado"].includes(processo.status)) return;

  const pendencias = await pendenciasDoProcesso(processoId, con);
  const novoStatus = pendencias.length > 0 ? "documentos_pendentes" : "pronto_para_protocolo";

  if (processo.status === novoStatus) return;

  await con
    .update(processos)
    .set({ status: novoStatus, atualizadoEm: new Date() })
    .where(eq(processos.id, processoId));
}
