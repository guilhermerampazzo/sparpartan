"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { despesas } from "@/db/schema";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

export async function marcarDespesaComoPaga(despesaId: string) {
  await db
    .update(despesas)
    .set({ paga: true, pagaEm: new Date() })
    .where(eq(despesas.id, despesaId));

  revalidatePath("/vendas/despesas");
}

export async function criarDespesa(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = String(formData.get("valor") ?? "");
  const data = String(formData.get("data") ?? "");
  const recorrente = formData.get("recorrente") === "on";
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!descricao, "Informe a descrição.")
    .exigir(!!valor && Number(valor) > 0, "Informe um valor válido.")
    .exigir(!!data, "Informe a data.").erro;
  if (erro) return { erro, valores };

  const diaVencimento = recorrente ? new Date(`${data}T00:00:00`).getDate() : null;

  await db.insert(despesas).values({
    descricao,
    valor,
    data,
    categoria: String(formData.get("categoria") ?? "variavel") as
      | "fixa"
      | "variavel"
      | "imposto"
      | "outra",
    recorrente,
    diaVencimento,
  });

  redirect("/vendas/despesas");
}

/**
 * Replica as despesas marcadas como recorrentes do mês anterior para o mês atual,
 * evitando duplicar as que já foram lançadas manualmente neste mês (por descrição).
 */
export async function replicarDespesasRecorrentes() {
  const hoje = new Date();
  const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);

  const recorrentesMesAnterior = await db
    .select()
    .from(despesas)
    .where(
      and(
        eq(despesas.recorrente, true),
        gte(despesas.data, inicioMesAnterior.toISOString().slice(0, 10)),
        lt(despesas.data, inicioMesAtual.toISOString().slice(0, 10))
      )
    );

  const jaLancadasEsteMes = await db
    .select({ descricao: despesas.descricao })
    .from(despesas)
    .where(gte(despesas.data, inicioMesAtual.toISOString().slice(0, 10)));
  const descricoesLancadas = new Set(jaLancadasEsteMes.map((d) => d.descricao));

  for (const original of recorrentesMesAnterior) {
    if (descricoesLancadas.has(original.descricao)) continue;
    const dia = original.diaVencimento ?? 1;
    const novaData = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
    await db.insert(despesas).values({
      descricao: original.descricao,
      valor: original.valor,
      data: novaData.toISOString().slice(0, 10),
      categoria: original.categoria,
      recorrente: true,
      diaVencimento: dia,
    });
  }

  redirect("/vendas/despesas");
}
