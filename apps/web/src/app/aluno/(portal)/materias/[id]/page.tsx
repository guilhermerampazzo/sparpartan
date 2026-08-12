import { and, asc, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PlayCircle, FileText, ClipboardList, CheckCircle2, Circle } from "lucide-react";
import { db } from "@/db";
import { materias, capitulos, aulas, provas, progressoAula } from "@/db/schema";
import { authAluno } from "@/lib/auth-aluno";
import { verificarMatriculaAtiva } from "@/lib/acesso-aluno";
import { EmptyState, BackButton } from "@/components/ui";

export default async function MateriaAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await authAluno();
  if (!session?.user?.id) redirect("/aluno/login");
  const alunoId = session.user.id as string;

  const [materia] = await db.select().from(materias).where(eq(materias.id, id)).limit(1);
  if (!materia || !materia.ativo) notFound();

  const temAcesso = await verificarMatriculaAtiva(alunoId, id);

  if (!temAcesso) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
      <BackButton href="/aluno" />
        <h2 className="font-display text-title-lg font-bold text-primary">{materia.titulo}</h2>
        {materia.descricao && <p className="text-body-sm text-outline">{materia.descricao}</p>}
        {materia.precoCentavos ? (
          <>
            <p className="text-title-md font-semibold text-primary">
              {(materia.precoCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <Link
              href={`/aluno/materias/${id}/comprar`}
              className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90"
            >
              Comprar acesso
            </Link>
          </>
        ) : (
          <p className="text-body-sm text-outline">
            Você ainda não tem acesso a esta matéria. Fale com a equipe para liberar o acesso.
          </p>
        )}
      </div>
    );
  }

  const listaCapitulos = await db
    .select()
    .from(capitulos)
    .where(and(eq(capitulos.materiaId, id), eq(capitulos.status, "publicado")))
    .orderBy(asc(capitulos.ordem));

  const capituloIds = listaCapitulos.map((c) => c.id);

  const listaAulas = capituloIds.length
    ? await db
        .select()
        .from(aulas)
        .where(and(inArray(aulas.capituloId, capituloIds), eq(aulas.status, "publicado")))
        .orderBy(asc(aulas.ordem))
    : [];
  const aulasPorCapitulo = new Map<string, typeof listaAulas>();
  for (const aula of listaAulas) {
    const lista = aulasPorCapitulo.get(aula.capituloId) ?? [];
    lista.push(aula);
    aulasPorCapitulo.set(aula.capituloId, lista);
  }

  const progresso = await db
    .select({ aulaId: progressoAula.aulaId })
    .from(progressoAula)
    .where(and(eq(progressoAula.alunoId, alunoId), eq(progressoAula.concluida, true)));
  const aulasConcluidas = new Set(progresso.map((p) => p.aulaId));

  const provasPorCapitulo = capituloIds.length
    ? await db
        .select()
        .from(provas)
        .where(and(inArray(provas.capituloId, capituloIds), eq(provas.status, "publicado")))
    : [];
  const provasDaMateria = await db
    .select()
    .from(provas)
    .where(and(eq(provas.materiaId, id), eq(provas.status, "publicado")));

  return (
    <div className="space-y-6">
      <h2 className="font-display text-headline-md font-bold text-primary">{materia.titulo}</h2>
      {materia.descricao && <p className="text-body-sm text-outline">{materia.descricao}</p>}

      {listaCapitulos.length === 0 && provasDaMateria.length === 0 ? (
        <EmptyState icon={FileText} title="Conteúdo em preparação" description="Volte em breve." />
      ) : (
        <div className="space-y-5">
          {listaCapitulos.map((cap) => {
            const aulasDoCap = aulasPorCapitulo.get(cap.id) ?? [];
            const provasDoCap = provasPorCapitulo.filter((p) => p.capituloId === cap.id);
            return (
              <div key={cap.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
                <h3 className="mb-1 font-display text-title-md font-bold text-primary">{cap.titulo}</h3>
                {cap.descricao && <p className="mb-3 text-body-sm text-outline">{cap.descricao}</p>}
                <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
                  {aulasDoCap.map((aula) => {
                    const concluida = aulasConcluidas.has(aula.id);
                    return (
                      <li key={aula.id}>
                        <Link
                          href={`/aluno/aulas/${aula.id}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low"
                        >
                          {concluida ? (
                            <CheckCircle2 size={16} className="shrink-0 text-success" />
                          ) : (
                            <Circle size={16} className="shrink-0 text-outline" />
                          )}
                          {aula.tipoConteudo.startsWith("video") ? (
                            <PlayCircle size={16} className="shrink-0 text-outline" />
                          ) : (
                            <FileText size={16} className="shrink-0 text-outline" />
                          )}
                          <span className="text-sm text-primary">{aula.titulo}</span>
                        </Link>
                      </li>
                    );
                  })}
                  {provasDoCap.map((prova) => (
                    <li key={prova.id}>
                      <Link
                        href={`/aluno/provas/${prova.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low"
                      >
                        <ClipboardList size={16} className="shrink-0 text-outline" />
                        <span className="text-sm text-primary">{prova.titulo}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {provasDaMateria.length > 0 && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
              <h3 className="mb-3 font-display text-title-md font-bold text-primary">Provas da matéria</h3>
              <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
                {provasDaMateria.map((prova) => (
                  <li key={prova.id}>
                    <Link
                      href={`/aluno/provas/${prova.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low"
                    >
                      <ClipboardList size={16} className="shrink-0 text-outline" />
                      <span className="text-sm text-primary">{prova.titulo}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
