"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pendencias } from "@/db/schema";
import { criarPendencia } from "@/lib/pendencias-db";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";
import type { PendenciaCategoria, PendenciaPrioridade } from "@/lib/pendencias";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuidOuNull(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "");
  return UUID_RE.test(texto) ? texto : null;
}

export async function criarPendenciaManual(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!descricao, "Informe a descrição da pendência.")
    .exigir(!!data, "Informe a data da pendência.").erro;
  if (erro) return { erro, valores };

  const criadoPorId = await idUsuarioEquipe();

  const id = await criarPendencia({
    descricao,
    categoria: (formData.get("categoria") as PendenciaCategoria) || "processos",
    prioridade: (formData.get("prioridade") as PendenciaPrioridade) || "media",
    data,
    horario: String(formData.get("horario") ?? "").trim() || null,
    clienteId: uuidOuNull(formData.get("clienteId")),
    embarcacaoId: uuidOuNull(formData.get("embarcacaoId")),
    processoId: uuidOuNull(formData.get("processoId")),
    responsavel: String(formData.get("responsavel") ?? "").trim() || null,
    responsavelId: uuidOuNull(formData.get("responsavelId")),
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    origem: "manual",
    privada: formData.get("privada") === "on",
    criadoPorId,
  });

  await registrarAuditoria("criar", "pendencia", id, descricao);
  redirect("/pendencias");
}

export async function atualizarPendencia(
  pendenciaId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!descricao, "Informe a descrição da pendência.")
    .exigir(!!data, "Informe a data da pendência.").erro;
  if (erro) return { erro, valores };

  await db
    .update(pendencias)
    .set({
      descricao,
      categoria: (formData.get("categoria") as PendenciaCategoria) || "processos",
      prioridade: (formData.get("prioridade") as PendenciaPrioridade) || "media",
      data,
      horario: String(formData.get("horario") ?? "").trim() || null,
      clienteId: uuidOuNull(formData.get("clienteId")),
      embarcacaoId: uuidOuNull(formData.get("embarcacaoId")),
      processoId: uuidOuNull(formData.get("processoId")),
      responsavel: String(formData.get("responsavel") ?? "").trim() || null,
      responsavelId: uuidOuNull(formData.get("responsavelId")),
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
      privada: formData.get("privada") === "on",
      atualizadoEm: new Date(),
    })
    .where(eq(pendencias.id, pendenciaId));

  await registrarAuditoria("atualizar", "pendencia", pendenciaId, descricao);
  revalidatePath("/pendencias");
  redirect("/pendencias");
}

export async function concluirPendencia(pendenciaId: string) {
  await db
    .update(pendencias)
    .set({
      status: "concluida",
      concluidaEm: new Date(),
      concluidoPorId: await idUsuarioEquipe(),
      atualizadoEm: new Date(),
    })
    .where(eq(pendencias.id, pendenciaId));

  await registrarAuditoria("atualizar", "pendencia", pendenciaId, "concluída");
  revalidatePath("/pendencias");
  revalidatePath("/");
}

export async function reabrirPendencia(pendenciaId: string) {
  await db
    .update(pendencias)
    .set({ status: "pendente", concluidaEm: null, concluidoPorId: null, atualizadoEm: new Date() })
    .where(eq(pendencias.id, pendenciaId));

  await registrarAuditoria("atualizar", "pendencia", pendenciaId, "reaberta");
  revalidatePath("/pendencias");
  revalidatePath("/");
}

/** Arquiva sem apagar — a pendência permanece no histórico. */
export async function arquivarPendencia(pendenciaId: string) {
  await db
    .update(pendencias)
    .set({
      status: "arquivada",
      arquivadaEm: new Date(),
      atualizadoEm: new Date(),
    })
    .where(eq(pendencias.id, pendenciaId));

  await registrarAuditoria("excluir", "pendencia", pendenciaId, "arquivada");
  revalidatePath("/pendencias");
  revalidatePath("/");
}
