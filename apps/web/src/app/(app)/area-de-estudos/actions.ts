"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { materiaisEstudo, progressoEstudo } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

export async function criarMaterial(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const servicoId = String(formData.get("servicoId") ?? "");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!servicoId, "Selecione o serviço.")
    .exigir(!!titulo, "Informe o título.")
    .exigir(!!url, "Informe a URL.").erro;
  if (erro) return { erro, valores };

  const [material] = await db
    .insert(materiaisEstudo)
    .values({
      servicoId,
      titulo,
      url,
      categoria: String(formData.get("categoria") ?? "") || null,
      tipo: String(formData.get("tipo") ?? "pdf") as "pdf" | "video" | "link",
    })
    .returning({ id: materiaisEstudo.id });

  await registrarAuditoria("criar", "material_estudo", material.id, titulo);
  redirect("/area-de-estudos");
}

export async function alternarProgresso(
  clienteId: string,
  materialId: string,
  concluidoAtual: boolean
) {
  const [existente] = await db
    .select()
    .from(progressoEstudo)
    .where(
      and(eq(progressoEstudo.clienteId, clienteId), eq(progressoEstudo.materialId, materialId))
    )
    .limit(1);

  if (existente) {
    await db
      .update(progressoEstudo)
      .set({ concluido: !concluidoAtual, atualizadoEm: new Date() })
      .where(eq(progressoEstudo.id, existente.id));
  } else {
    await db.insert(progressoEstudo).values({ clienteId, materialId, concluido: true });
  }

  await registrarAuditoria(
    "atualizar",
    "progresso_estudo",
    materialId,
    `cliente ${clienteId} — ${concluidoAtual ? "desmarcado" : "marcado como concluído"}`
  );
  revalidatePath("/area-de-estudos");
}
