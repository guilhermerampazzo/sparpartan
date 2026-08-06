"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { turmas } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

export async function criarTurma(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!nome, "Informe o nome da turma.").erro;
  if (erro) return { erro, valores };

  await db.insert(turmas).values({
    nome,
    inicioEm: String(formData.get("inicioEm") ?? "") || null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    criadoPorId: await idUsuarioEquipe(),
  });

  await registrarAuditoria("criar", "turma", "", nome);
  redirect("/escola/turmas");
}

export async function concluirTurma(turmaId: string) {
  await db
    .update(turmas)
    .set({ status: "concluida" })
    .where(eq(turmas.id, turmaId));
  await registrarAuditoria("atualizar", "turma", turmaId, "turma concluída");
  revalidatePath("/escola/turmas");
}

export async function cancelarTurma(turmaId: string) {
  await db
    .update(turmas)
    .set({ status: "cancelada" })
    .where(eq(turmas.id, turmaId));
  await registrarAuditoria("atualizar", "turma", turmaId, "turma cancelada");
  revalidatePath("/escola/turmas");
}
