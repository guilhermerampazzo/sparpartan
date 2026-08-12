import { and, asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Paperclip, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { aulas, capitulos, materiaisApoio, progressoAula } from "@/db/schema";
import { authAluno } from "@/lib/auth-aluno";
import { verificarMatriculaAtiva } from "@/lib/acesso-aluno";
import { marcarAulaConcluida } from "../actions";

import { BackButton } from "@/components/ui";

export default async function AulaAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await authAluno();
  if (!session?.user?.id) redirect("/aluno/login");
  const alunoId = session.user.id as string;

  const [aula] = await db.select().from(aulas).where(eq(aulas.id, id)).limit(1);
  if (!aula || aula.status !== "publicado") notFound();

  const [capitulo] = await db.select().from(capitulos).where(eq(capitulos.id, aula.capituloId)).limit(1);
  if (!capitulo) notFound();

  const temAcesso = await verificarMatriculaAtiva(alunoId, capitulo.materiaId);
  if (!temAcesso) redirect(`/aluno/materias/${capitulo.materiaId}`);

  const materiais = await db
    .select()
    .from(materiaisApoio)
    .where(
      and(
        eq(materiaisApoio.aulaId, id)
      )
    )
    .orderBy(asc(materiaisApoio.ordem));

  const materiaisCapitulo = await db
    .select()
    .from(materiaisApoio)
    .where(eq(materiaisApoio.capituloId, capitulo.id))
    .orderBy(asc(materiaisApoio.ordem));

  const [progresso] = await db
    .select({ concluida: progressoAula.concluida })
    .from(progressoAula)
    .where(and(eq(progressoAula.alunoId, alunoId), eq(progressoAula.aulaId, id)))
    .limit(1);

  const concluida = progresso?.concluida ?? false;
  const marcarComId = marcarAulaConcluida.bind(null, id);

  const urlVideo = aula.videoArquivo ? `/api/lms/arquivos/${aula.videoArquivo.replace(/^lms\//, "")}` : null;

  return (
      <div className="mx-auto max-w-3xl space-y-6">
      <BackButton href="/aluno" />
      <div>
        <Link href={`/aluno/materias/${capitulo.materiaId}`} className="text-body-sm text-outline hover:underline">
          ← {capitulo.titulo}
        </Link>
        <h2 className="font-display text-headline-md font-bold text-primary">{aula.titulo}</h2>
      </div>

      {(aula.tipoConteudo === "video_upload" || aula.tipoConteudo === "misto") && urlVideo && (
        <video controls className="w-full rounded-xl border border-outline-variant" src={urlVideo} />
      )}

      {(aula.tipoConteudo === "video_link" || aula.tipoConteudo === "misto") && aula.videoUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-outline-variant">
          <iframe src={aula.videoUrl} className="h-full w-full" allowFullScreen />
        </div>
      )}

      {aula.corpoHtml && (
        <div
          className="prose prose-sm max-w-none text-on-surface"
          dangerouslySetInnerHTML={{ __html: aula.corpoHtml }}
        />
      )}

      {(materiais.length > 0 || materiaisCapitulo.length > 0) && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <h3 className="mb-2 flex items-center gap-2 font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            <Paperclip size={14} /> Materiais de apoio
          </h3>
          <ul className="space-y-1">
            {[...materiais, ...materiaisCapitulo].map((material) => (
              <li key={material.id}>
                <a
                  href={
                    material.tipo === "upload"
                      ? `/api/lms/arquivos/${material.url.replace(/^lms\//, "")}`
                      : material.url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {material.titulo}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form action={marcarComId}>
        <button
          type="submit"
          disabled={concluida}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-60"
        >
          <CheckCircle2 size={16} />
          {concluida ? "Aula concluída" : "Marcar como concluída"}
        </button>
      </form>
    </div>
  );
}
