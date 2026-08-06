"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { certificados } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

export async function criarCertificado(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const alunoId = String(formData.get("alunoId") ?? "");
  const materiaId = String(formData.get("materiaId") ?? "") || null;
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!alunoId, "Selecione o aluno.").erro;
  if (erro) return { erro, valores };

  await db.insert(certificados).values({
    alunoId,
    materiaId,
    criadoPorId: await idUsuarioEquipe(),
  });

  await registrarAuditoria("criar", "certificado", "", "certificado para emitir");
  redirect("/escola/certificados");
}

export async function marcarCertificadoEmitido(certificadoId: string) {
  await db
    .update(certificados)
    .set({ status: "emitido", emitidoEm: new Date() })
    .where(eq(certificados.id, certificadoId));

  await registrarAuditoria("atualizar", "certificado", certificadoId, "marcado como emitido");
  revalidatePath("/escola/certificados");
  revalidatePath("/escola");
}

export async function excluirCertificado(certificadoId: string) {
  await db.delete(certificados).where(eq(certificados.id, certificadoId));
  await registrarAuditoria("excluir", "certificado", certificadoId, "certificado excluído");
  revalidatePath("/escola/certificados");
}
