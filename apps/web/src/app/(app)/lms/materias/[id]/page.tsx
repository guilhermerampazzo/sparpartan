import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2, BookMarked, Pencil } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { materias, capitulos } from "@/db/schema";
import { SectionCard, Button, ConfirmButton, EmptyState, Badge, BackButton } from "@/components/ui";
import { atualizarMateria } from "../actions";
import { alternarStatusCapitulo, criarCapitulo, excluirCapitulo, reordenarCapitulo } from "../../capitulos/actions";
import { MateriaForm } from "../materia-form";
import { CapituloForm } from "../../capitulos/capitulo-form";

export default async function MateriaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [materia] = await db.select().from(materias).where(eq(materias.id, id)).limit(1);
  if (!materia) notFound();

  const listaCapitulos = await db
    .select()
    .from(capitulos)
    .where(eq(capitulos.materiaId, id))
    .orderBy(asc(capitulos.ordem));

  const atualizarComId = atualizarMateria.bind(null, id);
  const criarCapituloComId = criarCapitulo.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/materias" />
      <h1 className="font-display text-headline-lg font-bold text-primary">{materia.titulo}</h1>

      <SectionCard title="Dados da matéria">
        <MateriaForm
          action={atualizarComId}
          valoresIniciais={{
            titulo: materia.titulo,
            descricao: materia.descricao ?? "",
            icone: materia.icone ?? "",
            preco: materia.precoCentavos ? (materia.precoCentavos / 100).toFixed(2) : "",
          }}
        />
      </SectionCard>

      <SectionCard title="Capítulos">
        <div className="space-y-3">
          {listaCapitulos.length === 0 ? (
            <EmptyState icon={BookMarked} title="Nenhum capítulo ainda" description="Crie o primeiro capítulo abaixo." />
          ) : (
            <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
              {listaCapitulos.map((cap, indice) => {
                const excluirComId = excluirCapitulo.bind(null, id, cap.id);
                const subir = reordenarCapitulo.bind(null, id, cap.id, "cima");
                const descer = reordenarCapitulo.bind(null, id, cap.id, "baixo");
                const alternarStatus = alternarStatusCapitulo.bind(
                  null,
                  id,
                  cap.id,
                  cap.status === "publicado" ? "rascunho" : "publicado"
                );
                return (
                  <li key={cap.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <Link href={`/lms/capitulos/${cap.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="font-medium text-primary">{cap.titulo}</span>
                      {cap.descricao && <p className="truncate text-body-sm text-outline">{cap.descricao}</p>}
                    </Link>
                    <Badge size="sm">#{cap.ordem}</Badge>
                    <form action={alternarStatus}>
                      <button type="submit">
                        <Badge size="sm" tone={cap.status === "publicado" ? "success" : "neutral"}>
                          {cap.status === "publicado" ? "Publicado" : "Rascunho"}
                        </Badge>
                      </button>
                    </form>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/lms/capitulos/${cap.id}/editar`}
                        className="p-1.5 text-outline hover:text-primary"
                        title="Editar capítulo"
                      >
                        <Pencil size={14} />
                      </Link>
                      <form action={subir}>
                        <Button type="submit" variant="text" size="sm" disabled={indice === 0}>
                          <ArrowUp size={14} />
                        </Button>
                      </form>
                      <form action={descer}>
                        <Button type="submit" variant="text" size="sm" disabled={indice === listaCapitulos.length - 1}>
                          <ArrowDown size={14} />
                        </Button>
                      </form>
                      <form action={excluirComId}>
                        <ConfirmButton
                          mensagem={`Excluir o capítulo "${cap.titulo}"? Isso apaga as aulas e materiais dele.`}
                          variant="text"
                          icon={<Trash2 size={12} />}
                        >
                          Excluir
                        </ConfirmButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <CapituloForm action={criarCapituloComId} />
        </div>
      </SectionCard>
    </div>
  );
}
