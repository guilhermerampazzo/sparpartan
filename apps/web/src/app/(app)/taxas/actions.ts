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
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

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

  const [taxa] = await db
    .insert(taxasPagar)
    .values({
      descricao,
      numero: String(formData.get("numero") ?? "").trim() || null,
      valor,
      vencimento: String(formData.get("vencimento") ?? "") || null,
      clienteId: String(formData.get("clienteId") ?? "") || null,
      processoId: String(formData.get("processoId") ?? "") || null,
      arquivoCaminho,
      // Sem boleto anexado ainda não foi emitida — o indicador "Taxas para emissão"
      // da Central Operacional é alimentado automaticamente por esta regra.
      status: arquivoCaminho ? "pendente" : "para_emissao",
      criadoPorId: await idUsuarioEquipe(),
    })
    .returning({ id: taxasPagar.id });

  await registrarAuditoria("criar", "taxa_pagar", taxa.id, descricao);
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
    .select({ clienteId: taxasPagar.clienteId })
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
