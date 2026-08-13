"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { taxasPagar } from "@/db/schema";
import { salvarArquivoLocal, uploadsDir } from "@/lib/storage";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { reclassificarProcesso } from "@/lib/processos";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

/**
 * Pagamento de taxa reflete no processo vinculado: recalcula a etapa do processo
 * (documentos, pagamentos etc.) e registra em auditoria — sem quebrar o fluxo.
 */
async function refletirPagamentoNoProcesso(processoId: string) {
  try {
    await reclassificarProcesso(processoId);
    await registrarAuditoria("atualizar", "processo", processoId, "pagamento de taxa refletido no processo");
  } catch {
    // reclassificação é otimista — nunca impede o pagamento de ser registrado
  }
}

export async function criarTaxa(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = String(formData.get("valor") ?? "");
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!descricao, "Informe a descrição da taxa.")
    .exigir(!!valor && Number(valor) > 0, "Informe um valor válido.").erro;
  if (erro) return { erro, valores };

  const arquivo = formData.get("arquivo") as File | null;
  let arquivoCaminho: string | null = null;
  if (arquivo && arquivo.size > 0) {
    try {
      arquivoCaminho = await salvarArquivoLocal(arquivo, "taxas", "documento");
    } catch (e) {
      return { erro: e instanceof Error ? e.message : "Falha ao salvar o boleto.", valores };
    }
  }

  // Reconhecimento automático de pagamento: o documento (comprovante) indica quitação.
  const documentoPago = formData.get("documentoPago") === "on";
  const processoId = String(formData.get("processoId") ?? "").trim() || null;
  const clienteId = String(formData.get("clienteId") ?? "").trim() || null;

  const [taxa] = await db
    .insert(taxasPagar)
    .values({
      descricao,
      numero: String(formData.get("numero") ?? "").trim() || null,
      valor,
      vencimento: String(formData.get("vencimento") ?? "") || null,
      clienteId,
      processoId,
      arquivoCaminho,
      // Sem boleto anexado ainda não foi emitida — o indicador "Taxas para emissão"
      // da Central Operacional é alimentado automaticamente por esta regra.
      status: documentoPago ? "pago" : arquivoCaminho ? "pendente" : "para_emissao",
      pagoEm: documentoPago ? new Date() : null,
      criadoPorId: await idUsuarioEquipe(),
    })
    .returning({ id: taxasPagar.id });

  await registrarAuditoria("criar", "taxa_pagar", taxa.id, descricao);

  // Taxa reconhecida como paga reflete no processo vinculado.
  if (documentoPago && processoId) {
    await refletirPagamentoNoProcesso(processoId);
  }

  redirect("/taxas");
}

export async function marcarTaxaComoEmitida(taxaId: string) {
  const [taxa] = await db
    .select({ clienteId: taxasPagar.clienteId })
    .from(taxasPagar)
    .where(eq(taxasPagar.id, taxaId))
    .limit(1);

  await db
    .update(taxasPagar)
    .set({ status: "pendente" })
    .where(eq(taxasPagar.id, taxaId));

  await registrarAuditoria("atualizar", "taxa_pagar", taxaId, "marcada como emitida");
  revalidatePath("/taxas");
  if (taxa?.clienteId) revalidatePath(`/clientes/${taxa.clienteId}`);
}

export async function marcarTaxaComoPaga(taxaId: string, formData: FormData) {
  const [taxa] = await db
    .select({ clienteId: taxasPagar.clienteId, processoId: taxasPagar.processoId, status: taxasPagar.status })
    .from(taxasPagar)
    .where(eq(taxasPagar.id, taxaId))
    .limit(1);

  await db
    .update(taxasPagar)
    .set({
      status: "pago",
      pagoEm: new Date(),
      formaPagamento: String(formData.get("formaPagamento") ?? "") || null,
    })
    .where(eq(taxasPagar.id, taxaId));

  await registrarAuditoria("atualizar", "taxa_pagar", taxaId, "marcada como paga");

  // Reflexo automático: taxa paga atualiza o processo vinculado.
  if (taxa?.processoId && taxa.status !== "pago") {
    await refletirPagamentoNoProcesso(taxa.processoId);
  }

  revalidatePath("/taxas");
  if (taxa?.clienteId) revalidatePath(`/clientes/${taxa.clienteId}`);
  revalidatePath("/agenda");
}

export async function excluirTaxa(taxaId: string) {
  const [taxa] = await db.select().from(taxasPagar).where(eq(taxasPagar.id, taxaId)).limit(1);
  if (!taxa) throw new Error("Taxa não encontrada");

  if (taxa.arquivoCaminho) {
    try {
      await unlink(path.join(uploadsDir(), taxa.arquivoCaminho));
    } catch {
      // arquivo já não existe no disco — sem problema
    }
  }

  await db.delete(taxasPagar).where(eq(taxasPagar.id, taxaId));
  await registrarAuditoria(
    "excluir",
    "taxa_pagar",
    taxaId,
    `${taxa.descricao}${taxa.numero ? ` (GRU ${taxa.numero})` : ""}`
  );

  revalidatePath("/taxas");
  if (taxa.clienteId) revalidatePath(`/clientes/${taxa.clienteId}`);
  revalidatePath("/agenda");
}
