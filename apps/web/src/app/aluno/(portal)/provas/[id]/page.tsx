import { and, desc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { provas, capitulos, tentativasProva } from "@/db/schema";
import { authAluno } from "@/lib/auth-aluno";
import { verificarMatriculaAtiva } from "@/lib/acesso-aluno";
import { iniciarTentativa } from "../actions";

import { BackButton } from "@/components/ui";

const STATUS_LABEL: Record<string, string> = {
  em_andamento: "Em andamento",
  aguardando_correcao: "Aguardando correção",
  corrigida: "Corrigida",
};

export default async function ProvaAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await authAluno();
  if (!session?.user?.id) redirect("/aluno/login");
  const alunoId = session.user.id as string;

  const [prova] = await db.select().from(provas).where(eq(provas.id, id)).limit(1);
  if (!prova || prova.status !== "publicado") notFound();

  const materiaId = prova.materiaId
    ? prova.materiaId
    : prova.capituloId
      ? (await db.select().from(capitulos).where(eq(capitulos.id, prova.capituloId)).limit(1))[0]?.materiaId
      : null;
  if (!materiaId) notFound();

  const temAcesso = await verificarMatriculaAtiva(alunoId, materiaId);
  if (!temAcesso) redirect(`/aluno/materias/${materiaId}`);

  const tentativas = await db
    .select()
    .from(tentativasProva)
    .where(and(eq(tentativasProva.alunoId, alunoId), eq(tentativasProva.provaId, id)))
    .orderBy(desc(tentativasProva.iniciadaEm));

  const iniciarComId = iniciarTentativa.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <BackButton href="/aluno" />
        <h2 className="font-display text-headline-md font-bold text-primary">{prova.titulo}</h2>
        {prova.descricao && <p className="text-body-sm text-outline">{prova.descricao}</p>}
        <p className="mt-1 text-body-sm text-outline">Nota mínima para aprovação: {prova.notaMinima}%</p>
      </div>

      <form action={iniciarComId}>
        <button
          type="submit"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90"
        >
          Iniciar nova tentativa
        </button>
      </form>

      {tentativas.length > 0 && (
        <div>
          <h3 className="mb-2 font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Suas tentativas
          </h3>
          <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
            {tentativas.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-4 py-3">
                <Link
                  href={
                    t.status === "em_andamento"
                      ? `/aluno/provas/${id}/tentativa/${t.id}`
                      : `/aluno/provas/${id}/tentativa/${t.id}/resultado`
                  }
                  className="text-sm text-primary hover:underline"
                >
                  {t.iniciadaEm.toLocaleDateString("pt-BR")}
                </Link>
                <span className="text-body-sm text-outline">
                  {STATUS_LABEL[t.status] ?? t.status}
                  {t.notaObtida !== null ? ` — ${t.notaObtida}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
