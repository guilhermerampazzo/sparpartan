import { and, eq, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { empresas, empresaDocumentos, empresaManutencoes, empresaAlertas } from "@/db/schema";

export const TIPOS_DOCUMENTO_EMPRESA = [
  { valor: "seguro_obrigatorio", rotulo: "Seguro obrigatório" },
  { valor: "documentacao_embarcacao", rotulo: "Documentação da embarcação" },
  { valor: "certificado", rotulo: "Certificado" },
  { valor: "licenca", rotulo: "Licença" },
  { valor: "habilitacao_marinheiro", rotulo: "Habilitação de marinheiro" },
  { valor: "outro", rotulo: "Outro documento" },
] as const;

export function rotuloTipoDocumentoEmpresa(tipo: string): string {
  return TIPOS_DOCUMENTO_EMPRESA.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

export function diasAte(dataIso: string | null | undefined): number | null {
  if (!dataIso) return null;
  const alvo = new Date(`${dataIso}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/** Situação do vencimento para exibição no painel. */
export function situacaoVencimento(dias: number | null): "em_dia" | "proximo" | "urgente" | "vencido" | null {
  if (dias === null) return null;
  if (dias < 0) return "vencido";
  if (dias <= 15) return "urgente";
  if (dias <= 35) return "proximo";
  return "em_dia";
}

/**
 * Recalcula os alertas de uma empresa a partir dos documentos e manutenções:
 * 35 dias → "vencimento_proximo"; 15 dias → "vencimento_urgente"; venceu → "vencido".
 * Manutenções com próxima data ≤ 35 dias → "manutencao_proxima".
 * Alertas já existentes são mantidos (não apaga pelo simples fato de visualizar);
 * quando o documento é atualizado/substituído ou marcado como regularizado, os
 * alertas do documento são resolvidos.
 */
export async function atualizarAlertasEmpresa(empresaId: string) {
  const documentos = await db
    .select()
    .from(empresaDocumentos)
    .where(and(eq(empresaDocumentos.empresaId, empresaId), eq(empresaDocumentos.regularizado, false)));

  for (const doc of documentos) {
    const dias = diasAte(doc.dataVencimento);
    const situacao = situacaoVencimento(dias);
    if (!situacao) continue;

    const tipo =
      situacao === "vencido" ? "vencido" : situacao === "urgente" ? "vencimento_urgente" : "vencimento_proximo";
    const mensagem =
      situacao === "vencido"
        ? `Documento ${doc.titulo ?? doc.tipo} VENCIDO há ${Math.abs(dias!)} dia(s).`
        : `Documento ${doc.titulo ?? doc.tipo} vence em ${dias} dia(s).`;

    const existente = await db
      .select()
      .from(empresaAlertas)
      .where(
        and(
          eq(empresaAlertas.empresaId, empresaId),
          eq(empresaAlertas.documentoId, doc.id),
          eq(empresaAlertas.tipo, tipo),
          eq(empresaAlertas.resolvido, false)
        )
      )
      .limit(1);

    if (existente.length === 0) {
      await db.insert(empresaAlertas).values({ empresaId, documentoId: doc.id, tipo, mensagem });
    }
  }

  // Manutenções próximas (próxima manutenção ou troca de óleo ≤ 35 dias)
  const manutencoes = await db
    .select()
    .from(empresaManutencoes)
    .where(eq(empresaManutencoes.empresaId, empresaId));

  for (const manut of manutencoes) {
    const datas = [manut.proximaManutencao, manut.proximaTrocaOleo].filter(Boolean) as string[];
    const proxima = datas.map((d) => diasAte(d)).filter((d): d is number => d !== null && d >= 0 && d <= 35);
    if (proxima.length === 0) continue;

    const existente = await db
      .select()
      .from(empresaAlertas)
      .where(
        and(
          eq(empresaAlertas.empresaId, empresaId),
          eq(empresaAlertas.manutencaoId, manut.id),
          eq(empresaAlertas.tipo, "manutencao_proxima"),
          eq(empresaAlertas.resolvido, false)
        )
      )
      .limit(1);

    if (existente.length === 0) {
      await db
        .insert(empresaAlertas)
        .values({ empresaId, manutencaoId: manut.id, tipo: "manutencao_proxima", mensagem: `Manutenção ${manut.descricao ?? manut.tipo} próxima (${proxima[0]} dia(s)).` });
    }
  }
}

/** Resolve os alertas de um documento (substituído/regularizado). */
export async function resolverAlertasDoDocumento(documentoId: string) {
  await db
    .update(empresaAlertas)
    .set({ resolvido: true })
    .where(and(eq(empresaAlertas.documentoId, documentoId), eq(empresaAlertas.resolvido, false)));
}
