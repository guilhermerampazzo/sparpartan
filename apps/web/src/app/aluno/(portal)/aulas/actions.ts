"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { aulas, capitulos, progressoAula } from "@/db/schema";
import { authAluno } from "@/lib/auth-aluno";
import { verificarMatriculaAtiva } from "@/lib/acesso-aluno";
import { registrarAuditoria } from "@/lib/audit";

export async function marcarAulaConcluida(aulaId: string) {
  const session = await authAluno();
  const alunoId = session?.user?.id as string | undefined;
  if (!alunoId) return;
  const alunoNome = session?.user?.name ?? "aluno";

  const [aula] = await db.select().from(aulas).where(eq(aulas.id, aulaId)).limit(1);
  if (!aula) return;

  const [capitulo] = await db.select().from(capitulos).where(eq(capitulos.id, aula.capituloId)).limit(1);
  if (!capitulo) return;

  const temAcesso = await verificarMatriculaAtiva(alunoId, capitulo.materiaId);
  if (!temAcesso) return;

  const [existente] = await db
    .select({ id: progressoAula.id })
    .from(progressoAula)
    .where(and(eq(progressoAula.alunoId, alunoId), eq(progressoAula.aulaId, aulaId)))
    .limit(1);

  if (existente) {
    await db
      .update(progressoAula)
      .set({ concluida: true, concluidaEm: new Date() })
      .where(eq(progressoAula.id, existente.id));
  } else {
    await db.insert(progressoAula).values({
      alunoId,
      aulaId,
      concluida: true,
      concluidaEm: new Date(),
    });
  }

  revalidatePath(`/aluno/aulas/${aulaId}`);
  revalidatePath(`/aluno/materias/${capitulo.materiaId}`);
  revalidatePath("/aluno");

  await registrarAuditoria(
    "atualizar",
    "progresso_aula",
    aulaId,
    `aula "${aula.titulo}" concluída`,
    alunoNome
  );
}
