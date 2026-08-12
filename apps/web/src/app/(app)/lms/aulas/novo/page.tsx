import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { capitulos } from "@/db/schema";
import { criarAula } from "../actions";
import { AulaForm } from "../aula-form";

import { BackButton } from "@/components/ui";

export default async function NovaAulaPage({
  searchParams,
}: {
  searchParams: Promise<{ capituloId?: string }>;
}) {
  const { capituloId } = await searchParams;
  if (!capituloId) notFound();

  const [capitulo] = await db.select().from(capitulos).where(eq(capitulos.id, capituloId)).limit(1);
  if (!capitulo) notFound();

  const criarComCapitulo = criarAula.bind(null, capituloId);

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/materias" />
      <h1 className="font-display text-headline-lg font-bold text-primary">
        Nova Aula — {capitulo.titulo}
      </h1>
      <AulaForm action={criarComCapitulo} />
    </div>
  );
}
