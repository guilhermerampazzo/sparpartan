"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { servicos, requisitosDocumento } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

export async function criarServico(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!nome, "Informe o nome do serviço.").erro;
  if (erro) return { erro, valores };

  const [servico] = await db
    .insert(servicos)
    .values({
      nome,
      descricao: String(formData.get("descricao") ?? "") || null,
      valor: String(formData.get("valor") ?? "") || null,
      custo: String(formData.get("custo") ?? "") || null,
      categoria: String(formData.get("categoria") ?? "despachante") as
        | "despachante"
        | "escola"
        | "engenharia"
        | "ultrassom",
      norma: String(formData.get("norma") ?? "") || null,
    })
    .returning({ id: servicos.id });

  await registrarAuditoria("criar", "servico", servico.id, nome);
  redirect("/servicos");
}

export async function atualizarServico(
  servicoId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!nome, "Informe o nome do serviço.").erro;
  if (erro) return { erro, valores };

  await db
    .update(servicos)
    .set({
      nome,
      descricao: String(formData.get("descricao") ?? "") || null,
      valor: String(formData.get("valor") ?? "") || null,
      custo: String(formData.get("custo") ?? "") || null,
      categoria: String(formData.get("categoria") ?? "despachante") as
        | "despachante"
        | "escola"
        | "engenharia"
        | "ultrassom",
      norma: String(formData.get("norma") ?? "") || null,
      atualizadoEm: new Date(),
    })
    .where(eq(servicos.id, servicoId));

  await registrarAuditoria("atualizar", "servico", servicoId, nome);
  redirect(`/servicos/${servicoId}`);
}

export async function excluirServico(servicoId: string) {
  await db.update(servicos).set({ ativo: false }).where(eq(servicos.id, servicoId));
  await registrarAuditoria("excluir", "servico", servicoId, "desativado");
  redirect("/servicos");
}

export async function criarRequisitoDocumento(servicoId: string, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Nome do documento é obrigatório");

  const [requisito] = await db
    .insert(requisitosDocumento)
    .values({
      servicoId,
      nome,
      obrigatorio: formData.get("obrigatorio") === "on",
    })
    .returning({ id: requisitosDocumento.id });

  await registrarAuditoria("criar", "requisito_documento", requisito.id, `serviço ${servicoId} — ${nome}`);
  revalidatePath(`/servicos/${servicoId}`);
}

export async function removerRequisitoDocumento(servicoId: string, requisitoId: string) {
  await db.delete(requisitosDocumento).where(eq(requisitosDocumento.id, requisitoId));
  await registrarAuditoria("excluir", "requisito_documento", requisitoId, `serviço ${servicoId}`);
  revalidatePath(`/servicos/${servicoId}`);
}
