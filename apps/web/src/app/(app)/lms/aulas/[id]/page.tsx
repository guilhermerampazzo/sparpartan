import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trash2, Paperclip } from "lucide-react";
import { db } from "@/db";
import { aulas, capitulos, materiaisApoio } from "@/db/schema";
import { SectionCard, ConfirmButton, EmptyState, Badge, BackButton } from "@/components/ui";
import { atualizarAula } from "../actions";
import { AulaForm } from "../aula-form";
import { criarMaterialApoio, excluirMaterialApoio } from "../../materiais/actions";
import { MaterialApoioForm } from "../../materiais/material-apoio-form";

export default async function AulaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [aula] = await db.select().from(aulas).where(eq(aulas.id, id)).limit(1);
  if (!aula) notFound();

  const [capitulo] = await db.select().from(capitulos).where(eq(capitulos.id, aula.capituloId)).limit(1);

  const listaMateriais = await db
    .select()
    .from(materiaisApoio)
    .where(eq(materiaisApoio.aulaId, id))
    .orderBy(asc(materiaisApoio.ordem));

  const atualizarComId = atualizarAula.bind(null, id);
  const voltarPara = `/lms/aulas/${id}`;
  const criarMaterialComEscopo = criarMaterialApoio.bind(null, {
    capituloId: null,
    aulaId: id,
    voltarPara,
  });

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/materias" />
      <div>
        {capitulo && (
          <Link href={`/lms/capitulos/${capitulo.id}`} className="text-body-sm text-outline hover:underline">
            ← {capitulo.titulo}
          </Link>
        )}
        <h1 className="font-display text-headline-lg font-bold text-primary">{aula.titulo}</h1>
      </div>

      <AulaForm
        action={atualizarComId}
        valoresIniciais={{
          titulo: aula.titulo,
          tipoConteudo: aula.tipoConteudo,
          corpoHtml: aula.corpoHtml ?? "",
          videoUrl: aula.videoUrl ?? "",
          ordem: aula.ordem,
          duracaoMinutos: aula.duracaoMinutos,
        }}
      />

      <SectionCard title="Materiais de apoio da aula">
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
    </div>
  );
}
