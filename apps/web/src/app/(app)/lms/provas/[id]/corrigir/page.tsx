import { asc, eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { db } from "@/db";
import { provas, tentativasProva, alunos, respostasAluno, questoes } from "@/db/schema";
import { SectionCard, EmptyState, Badge, SubmitButton, BackButton } from "@/components/ui";
import { corrigirTentativa } from "../../actions";

export default async function CorrigirProvaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [prova] = await db.select().from(provas).where(eq(provas.id, id)).limit(1);
  if (!prova) notFound();

  const tentativasPendentes = await db
    .select({
      id: tentativasProva.id,
      alunoId: tentativasProva.alunoId,
      alunoNome: alunos.nome,
      iniciadaEm: tentativasProva.iniciadaEm,
    })
    .from(tentativasProva)
    .innerJoin(alunos, eq(alunos.id, tentativasProva.alunoId))
    .where(and(eq(tentativasProva.provaId, id), eq(tentativasProva.status, "aguardando_correcao")))
    .orderBy(asc(tentativasProva.iniciadaEm));

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/provas/[id]" />
      <div>
        <Link href={`/lms/provas/${id}`} className="text-body-sm text-outline hover:underline">
          ← {prova.titulo}
        </Link>
        <h1 className="font-display text-headline-lg font-bold text-primary">Corrigir Tentativas</h1>
      </div>

      <SectionCard title="Aguardando correção">
        {tentativasPendentes.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nenhuma tentativa pendente"
            description="Não há dissertativas aguardando correção nesta prova no momento."
          />
        ) : (
          <div className="space-y-6">
            {await Promise.all(
              tentativasPendentes.map(async (tentativa) => {
                const respostasDissertativas = await db
                  .select({
                    respostaId: respostasAluno.id,
                    textoResposta: respostasAluno.textoResposta,
                    pontosObtidos: respostasAluno.pontosObtidos,
                    questaoId: questoes.id,
                    enunciado: questoes.enunciado,
                    pontosMaximos: questoes.pontos,
                  })
                  .from(respostasAluno)
                  .innerJoin(questoes, eq(questoes.id, respostasAluno.questaoId))
                  .where(and(eq(respostasAluno.tentativaId, tentativa.id), eq(questoes.tipo, "dissertativa")))
                  .orderBy(asc(questoes.ordem));

                const corrigirComIds = corrigirTentativa.bind(null, id, tentativa.id);

                return (
                  <form
                    key={tentativa.id}
                    action={corrigirComIds}
                    className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-primary">{tentativa.alunoNome}</p>
                        <p className="text-body-sm text-outline">
                          Iniciada em {new Date(tentativa.iniciadaEm).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <Badge size="sm" tone="warning">
                        Aguardando correção
                      </Badge>
                    </div>

                    {respostasDissertativas.length === 0 ? (
                      <p className="text-body-sm text-outline">Nenhuma resposta dissertativa nesta tentativa.</p>
                    ) : (
                      <ul className="space-y-4">
                        {respostasDissertativas.map((resposta) => (
                          <li key={resposta.respostaId} className="space-y-2 rounded-lg border border-outline-variant p-4">
                            <p className="text-sm font-medium text-primary">{resposta.enunciado}</p>
                            <p className="whitespace-pre-wrap rounded-lg bg-surface px-3 py-2 text-sm text-primary">
                              {resposta.textoResposta || "(sem resposta)"}
                            </p>
                            <label className="flex items-center gap-2 text-body-sm text-outline">
                              Pontos (máx {resposta.pontosMaximos})
                              <input
                                type="number"
                                name={`pontos[${resposta.respostaId}]`}
                                min={0}
                                max={resposta.pontosMaximos}
                                defaultValue={resposta.pontosObtidos ?? 0}
                                className="w-20 rounded-lg border border-outline-variant bg-surface px-2 py-1 text-sm text-primary outline-none focus:border-primary"
                              />
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}

                    <SubmitButton size="sm">Salvar correção</SubmitButton>
                  </form>
                );
              })
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
