import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { provas, questoes, opcoesQuestao } from "@/db/schema";
import { SectionCard, BackButton } from "@/components/ui";
import { atualizarQuestao } from "../../../../actions";
import { QuestaoForm } from "../../../../questao-form";

export default async function EditarQuestaoPage({
  params,
}: {
  params: Promise<{ id: string; questaoId: string }>;
}) {
  const { id, questaoId } = await params;

  const [prova] = await db.select().from(provas).where(eq(provas.id, id)).limit(1);
  if (!prova) notFound();

  const [questao] = await db.select().from(questoes).where(eq(questoes.id, questaoId)).limit(1);
  if (!questao) notFound();

  const opcoes = await db
    .select()
    .from(opcoesQuestao)
    .where(eq(opcoesQuestao.questaoId, questaoId))
    .orderBy(asc(opcoesQuestao.ordem));

  const atualizarComId = atualizarQuestao.bind(null, id, questaoId);

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/provas/[id]" />
      <div>
        <Link href={`/lms/provas/${id}`} className="text-body-sm text-outline hover:underline">
          ← {prova.titulo}
        </Link>
        <h1 className="font-display text-headline-lg font-bold text-primary">Editar questão</h1>
      </div>

      <SectionCard title="Dados da questão">
        <QuestaoForm
          action={atualizarComId}
          questaoExistente={{
            enunciado: questao.enunciado,
            tipo: questao.tipo,
            pontos: questao.pontos,
            opcoes: opcoes.map((o) => ({ texto: o.texto, parTexto: o.parTexto, correta: o.correta })),
          }}
          textoBotao="Salvar alterações"
        />
      </SectionCard>
    </div>
  );
}
