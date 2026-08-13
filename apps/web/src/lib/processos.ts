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
  "processo_preenchido",
  "processo_assinado",
  "aguardando_pagamento",
  "protocolado",
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
 * Fluxo padrão do processo: o avanço entre etapas (preenchido → assinado →
 * pagamento → protocolado → concluído) é manual, feito pelo operador. Esta
 * função só garante que o processo não regrida de etapas manuais e atualiza o
 * timestamp — a documentação pendente é exposta na Central de Pendências.
 */
export async function reclassificarProcesso(processoId: string, con: Tx = db) {
  const [processo] = await con.select().from(processos).where(eq(processos.id, processoId)).limit(1);
  if (!processo) return;

  // Não mexe em processo finalizado, protocolado ou em etapa manual avançada.
  if (["protocolado", "concluido", "cancelado"].includes(processo.status)) return;

  const pendencias = await pendenciasDoProcesso(processoId, con);
  // Com documentação pendente e ainda em "aberto", avança a conferência de documentos
  // apenas se o operador já começou o preenchimento; nunca regride etapas manuais.
  if (processo.status === "aberto" && pendencias.length === 0) {
    await con
      .update(processos)
      .set({ status: "processo_preenchido", atualizadoEm: new Date() })
      .where(eq(processos.id, processoId));
  }
}
