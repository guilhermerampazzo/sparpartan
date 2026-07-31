"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { taxasPagar } from "@/db/schema";
import { salvarArquivoLocal } from "@/lib/storage";
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
      criadoPorId: await idUsuarioEquipe(),
    })
    .returning({ id: taxasPagar.id });

  await registrarAuditoria("criar", "taxa_pagar", taxa.id, descricao);
  redirect("/taxas");
}

export async function marcarTaxaComoPaga(taxaId: string, formData: FormData) {
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
}
