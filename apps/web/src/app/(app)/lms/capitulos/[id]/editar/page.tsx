import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { capitulos, materias } from "@/db/schema";
import { SectionCard, BackButton } from "@/components/ui";
import { atualizarCapitulo } from "../../actions";
import { CapituloForm } from "../../capitulo-form";

export default async function EditarCapituloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [capitulo] = await db.select().from(capitulos).where(eq(capitulos.id, id)).limit(1);
  if (!capitulo) notFound();

  const [materia] = await db.select().from(materias).where(eq(materias.id, capitulo.materiaId)).limit(1);

  const atualizarComId = atualizarCapitulo.bind(null, capitulo.materiaId, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/materias" />
      <div>
        {materia && (
          <Link href={`/lms/materias/${materia.id}`} className="text-body-sm text-outline hover:underline">
            ← {materia.titulo}
          </Link>
        )}
        <h1 className="font-display text-headline-lg font-bold text-primary">Editar capítulo</h1>
      </div>

      <SectionCard title="Dados do capítulo">
        <CapituloForm
          action={atualizarComId}
          capitulo={{ titulo: capitulo.titulo, descricao: capitulo.descricao }}
          textoBotao="Salvar alterações"
        />
      </SectionCard>
    </div>
  );
}
