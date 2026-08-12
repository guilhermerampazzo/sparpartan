"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lembretes } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

/**
 * Reusa `lembretes` com `origem: 'manual'` e `referenciaTipo: null` — o varredor
 * do worker (`limparLembretesObsoletos`) só auto-resolve tipos de referência
 * conhecidos, então uma pendência manual é imune por construção.
 */
export async function criarPendencia(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const mensagem = String(formData.get("mensagem") ?? "").trim();
  const dataLembrete = String(formData.get("dataLembrete") ?? "") || new Date().toISOString().slice(0, 10);
  const clienteId = String(formData.get("clienteId") ?? "") || null;
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!mensagem, "Descreva a pendência.").erro;
  if (erro) return { erro, valores };

  const [lembrete] = await db
    .insert(lembretes)
    .values({
      mensagem,
      dataLembrete,
      clienteId,
      origem: "manual",
    })
    .returning({ id: lembretes.id });

  await registrarAuditoria("criar", "lembrete", lembrete.id, mensagem);
  revalidatePath("/pendentes");
  return null;
}

export async function resolverPendencia(lembreteId: string) {
  await db.update(lembretes).set({ resolvido: true }).where(eq(lembretes.id, lembreteId));
  await registrarAuditoria("alterar_status", "lembrete", lembreteId, "resolvido");
  revalidatePath("/pendentes");
}
