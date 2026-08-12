import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { capitulos } from "@/db/schema";
import { criarProva } from "../actions";
import { ProvaForm } from "../prova-form";

import { BackButton } from "@/components/ui";

export default async function NovaProvaPage({
  searchParams,
}: {
  searchParams: Promise<{ capituloId?: string }>;
}) {
  const { capituloId } = await searchParams;
  if (!capituloId) notFound();

  const [capitulo] = await db.select().from(capitulos).where(eq(capitulos.id, capituloId)).limit(1);
  if (!capitulo) notFound();

  const criarComCapitulo = criarProva.bind(null, capituloId);

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/materias" />
      <h1 className="font-display text-headline-lg font-bold text-primary">
        Nova Prova — {capitulo.titulo}
      </h1>
      <ProvaForm action={criarComCapitulo} />
    </div>
  );
}
