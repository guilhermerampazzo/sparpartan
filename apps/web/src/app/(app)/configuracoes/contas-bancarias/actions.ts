"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { contasBancarias } from "@/db/schema";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

export async function criarContaBancaria(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const apelido = String(formData.get("apelido") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!apelido, "Informe um apelido para a conta.").erro;
  if (erro) return { erro, valores };

  await db.insert(contasBancarias).values({
    apelido,
    banco: String(formData.get("banco") ?? "").trim() || null,
    agencia: String(formData.get("agencia") ?? "").trim() || null,
    conta: String(formData.get("conta") ?? "").trim() || null,
    pix: String(formData.get("pix") ?? "").trim() || null,
  });

  revalidatePath("/configuracoes/contas-bancarias");
  return null;
}

export async function excluirContaBancaria(contaId: string) {
  await db.delete(contasBancarias).where(eq(contasBancarias.id, contaId));
  revalidatePath("/configuracoes/contas-bancarias");
}

export async function atualizarContaBancaria(
  contaId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const apelido = String(formData.get("apelido") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!apelido, "Informe um apelido para a conta.").erro;
  if (erro) return { erro, valores };

  await db
    .update(contasBancarias)
    .set({
      apelido,
      banco: String(formData.get("banco") ?? "").trim() || null,
      agencia: String(formData.get("agencia") ?? "").trim() || null,
      conta: String(formData.get("conta") ?? "").trim() || null,
      pix: String(formData.get("pix") ?? "").trim() || null,
    })
    .where(eq(contasBancarias.id, contaId));

  revalidatePath("/configuracoes/contas-bancarias");
  redirect("/configuracoes/contas-bancarias");
}
