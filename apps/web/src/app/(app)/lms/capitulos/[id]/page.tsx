import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trash2, PlayCircle, FileText, Layers, Paperclip, ClipboardList } from "lucide-react";
import { db } from "@/db";
import { capitulos, materias, aulas, materiaisApoio, provas } from "@/db/schema";
import { SectionCard, LinkButton, ConfirmButton, EmptyState, Badge, BackButton } from "@/components/ui";
import { alternarStatusAula, excluirAula } from "../../aulas/actions";
import { criarMaterialApoio, excluirMaterialApoio } from "../../materiais/actions";
import { MaterialApoioForm } from "../../materiais/material-apoio-form";
import { alternarStatusProva, excluirProva } from "../../provas/actions";

const TIPO_CONTEUDO_LABEL: Record<string, string> = {
  video_upload: "Vídeo (upload)",
  video_link: "Vídeo (link)",
  texto: "Texto",
  misto: "Misto",
};

export default async function CapituloDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [capitulo] = await db.select().from(capitulos).where(eq(capitulos.id, id)).limit(1);
  if (!capitulo) notFound();

  const [materia] = await db.select().from(materias).where(eq(materias.id, capitulo.materiaId)).limit(1);

  const listaAulas = await db.select().from(aulas).where(eq(aulas.capituloId, id)).orderBy(asc(aulas.ordem));
  const listaMateriais = await db
    .select()
    .from(materiaisApoio)
    .where(eq(materiaisApoio.capituloId, id))
    .orderBy(asc(materiaisApoio.ordem));
  const listaProvas = await db.select().from(provas).where(eq(provas.capituloId, id)).orderBy(asc(provas.criadoEm));

  const voltarPara = `/lms/capitulos/${id}`;
  const criarMaterialComEscopo = criarMaterialApoio.bind(null, {
    capituloId: id,
    aulaId: null,
    voltarPara,
  });

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/materias" />
      <div>
        {materia && (
          <Link href={`/lms/materias/${materia.id}`} className="text-body-sm text-outline hover:underline">
            ← {materia.titulo}
          </Link>
        )}
        <h1 className="font-display text-headline-lg font-bold text-primary">{capitulo.titulo}</h1>
      </div>

      <SectionCard title="Aulas">
        <div className="space-y-3">
          {listaAulas.length === 0 ? (
            <EmptyState icon={Layers} title="Nenhuma aula ainda" description="Crie a primeira aula deste capítulo." />
          ) : (
            <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
              {listaAulas.map((aula) => {
                const excluirComId = excluirAula.bind(null, id, aula.id);
                const alternarStatus = alternarStatusAula.bind(
                  null,
                  id,
                  aula.id,
                  aula.status === "publicado" ? "rascunho" : "publicado"
                );
                return (
                  <li key={aula.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <Link href={`/lms/aulas/${aula.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
                      {aula.tipoConteudo.startsWith("video") ? (
                        <PlayCircle size={16} className="shrink-0 text-outline" />
                      ) : (
                        <FileText size={16} className="shrink-0 text-outline" />
                      )}
                      <span className="font-medium text-primary">{aula.titulo}</span>
                    </Link>
                    <Badge size="sm" tone="info">
                      {TIPO_CONTEUDO_LABEL[aula.tipoConteudo] ?? aula.tipoConteudo}
                    </Badge>
                    <form action={alternarStatus}>
                      <button type="submit">
                        <Badge size="sm" tone={aula.status === "publicado" ? "success" : "neutral"}>
                          {aula.status === "publicado" ? "Publicado" : "Rascunho"}
                        </Badge>
                      </button>
                    </form>
                    <form action={excluirComId}>
                      <ConfirmButton
                        mensagem={`Excluir a aula "${aula.titulo}"?`}
                        variant="text"
                        icon={<Trash2 size={12} />}
                      >
                        Excluir
                      </ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          <LinkButton href={`/lms/aulas/novo?capituloId=${id}`} size="sm">
            + Nova Aula
          </LinkButton>
        </div>
      </SectionCard>

      <SectionCard title="Materiais de apoio do capítulo">
        <div className="space-y-3">
          {listaMateriais.length === 0 ? (
            <EmptyState icon={Paperclip} title="Nenhum material de apoio" />
          ) : (
            <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
              {listaMateriais.map((material) => {
                const excluirComId = excluirMaterialApoio.bind(null, material.id, voltarPara);
                return (
                  <li key={material.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <a
                      href={
                        material.tipo === "upload"
                          ? `/api/lms/arquivos/${material.url.replace(/^lms\//, "")}`
                          : material.url
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 truncate hover:underline"
                    >
                      {material.titulo}
                    </a>
                    <Badge size="sm">{material.tipo}</Badge>
                    <form action={excluirComId}>
                      <ConfirmButton mensagem={`Excluir "${material.titulo}"?`} variant="text" icon={<Trash2 size={12} />}>
                        Excluir
                      </ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          <MaterialApoioForm action={criarMaterialComEscopo} />
        </div>
      </SectionCard>

      <SectionCard title="Provas">
        <div className="space-y-3">
          {listaProvas.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nenhuma prova ainda" description="Crie a primeira prova deste capítulo." />
          ) : (
            <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
              {listaProvas.map((prova) => {
                const excluirComId = excluirProva.bind(null, id, prova.id);
                const alternarStatus = alternarStatusProva.bind(
                  null,
                  id,
                  prova.id,
                  prova.status === "publicado" ? "rascunho" : "publicado"
                );
                return (
                  <li key={prova.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <Link href={`/lms/provas/${prova.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
                      <ClipboardList size={16} className="shrink-0 text-outline" />
                      <span className="font-medium text-primary">{prova.titulo}</span>
                    </Link>
                    <form action={alternarStatus}>
                      <button type="submit">
                        <Badge size="sm" tone={prova.status === "publicado" ? "success" : "neutral"}>
                          {prova.status === "publicado" ? "Publicado" : "Rascunho"}
                        </Badge>
                      </button>
                    </form>
                    <Link href={`/lms/provas/${prova.id}/corrigir`} className="text-body-sm text-outline hover:underline">
                      ver tentativas
                    </Link>
                    <form action={excluirComId}>
                      <ConfirmButton
                        mensagem={`Excluir a prova "${prova.titulo}"?`}
                        variant="text"
                        icon={<Trash2 size={12} />}
                      >
                        Excluir
                      </ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          <LinkButton href={`/lms/provas/novo?capituloId=${id}`} size="sm">
            + Nova Prova
          </LinkButton>
        </div>
      </SectionCard>
    </div>
  );
}
