import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { provas } from "@/db/schema";
import { criarQuestao } from "../../../actions";
import { QuestaoForm } from "../../../questao-form";

import { BackButton } from "@/components/ui";

export default async function NovaQuestaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [prova] = await db.select().from(provas).where(eq(provas.id, id)).limit(1);
  if (!prova) notFound();

  const criarComProva = criarQuestao.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/provas/[id]" />
      <h1 className="font-display text-headline-lg font-bold text-primary">
        Nova Questão — {prova.titulo}
      </h1>
      <QuestaoForm action={criarComProva} />
    </div>
  );
}
