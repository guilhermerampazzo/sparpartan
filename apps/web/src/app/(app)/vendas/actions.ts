"use server";

import { revalidatePath } from "next/cache";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { pagamentos } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";

export async function registrarPagamento(servicoContratadoId: string, formData: FormData) {
  const valor = String(formData.get("valor") ?? "").trim();
  if (!valor) throw new Error("Valor é obrigatório");

  const dataPagamento =
    String(formData.get("dataPagamento") ?? "") || new Date().toISOString().slice(0, 10);
  const formaPagamento = String(formData.get("formaPagamento") ?? "") || null;

  // Aprovar um orçamento já cria a cobrança pendente. Se houver uma em aberto,
  // quita ela em vez de criar um segundo registro solto.
  const [cobrancaAberta] = await db
    .select()
    .from(pagamentos)
    .where(
      and(
        eq(pagamentos.servicoContratadoId, servicoContratadoId),
        eq(pagamentos.valor, valor),
        eq(pagamentos.status, "pendente")
      )
    )
    .orderBy(asc(pagamentos.dataVencimento))
    .limit(1);

  if (cobrancaAberta) {
    await db
      .update(pagamentos)
      .set({ status: "pago", dataPagamento, formaPagamento })
      .where(eq(pagamentos.id, cobrancaAberta.id));
    await registrarAuditoria(
      "alterar_status",
      "pagamento",
      cobrancaAberta.id,
      `pago — R$ ${valor} (${formaPagamento ?? "forma não informada"})`
    );
  } else {
    const [novoPagamento] = await db
      .insert(pagamentos)
      .values({
        servicoContratadoId,
        valor,
        dataPagamento,
        formaPagamento,
        status: "pago",
      })
      .returning({ id: pagamentos.id });
    await registrarAuditoria(
      "criar",
      "pagamento",
      novoPagamento.id,
      `registrado R$ ${valor} (${formaPagamento ?? "forma não informada"})`
    );
  }

  revalidatePath("/vendas");
}
