import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { provas, questoes, opcoesQuestao, tentativasProva } from "@/db/schema";
import { authAluno } from "@/lib/auth-aluno";
import { responderTentativa } from "../../../actions";

import { BackButton } from "@/components/ui";

export default async function TentativaProvaPage({
  params,
}: {
  params: Promise<{ id: string; tentativaId: string }>;
}) {
  const { id, tentativaId } = await params;
  const session = await authAluno();
  if (!session?.user?.id) redirect("/aluno/login");
  const alunoId = session.user.id as string;

  const [prova] = await db.select().from(provas).where(eq(provas.id, id)).limit(1);
  if (!prova) notFound();

  const [tentativa] = await db.select().from(tentativasProva).where(eq(tentativasProva.id, tentativaId)).limit(1);
  if (!tentativa || tentativa.alunoId !== alunoId) notFound();
  if (tentativa.status !== "em_andamento") redirect(`/aluno/provas/${id}/tentativa/${tentativaId}/resultado`);

  const listaQuestoes = await db
    .select()
    .from(questoes)
    .where(eq(questoes.provaId, id))
    .orderBy(asc(questoes.ordem));

  const listaOpcoes = await db.select().from(opcoesQuestao).orderBy(asc(opcoesQuestao.ordem));
  const opcoesPorQuestao = new Map<string, typeof listaOpcoes>();
  for (const opcao of listaOpcoes) {
    const lista = opcoesPorQuestao.get(opcao.questaoId) ?? [];
    lista.push(opcao);
    opcoesPorQuestao.set(opcao.questaoId, lista);
  }

  const responderComId = responderTentativa.bind(null, id, tentativaId);

  return (
      <form action={responderComId} className="mx-auto max-w-2xl space-y-6">
      <h2 className="font-display text-headline-md font-bold text-primary">{prova.titulo}</h2>

      {listaQuestoes.map((questao, indice) => {
        const opcoes = opcoesPorQuestao.get(questao.id) ?? [];
        return (
          <div key={questao.id} className="space-y-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
            <p className="text-sm font-medium text-primary">
              {indice + 1}. {questao.enunciado}
            </p>

            {(questao.tipo === "escolha_unica" || questao.tipo === "verdadeiro_falso") && (
              <div className="space-y-2">
      <BackButton href="/aluno" />
                {opcoes.map((opcao) => (
                  <label key={opcao.id} className="flex items-center gap-2 text-sm text-on-surface">
                    <input type="radio" name={`resposta[${questao.id}]`} value={opcao.id} required className="h-4 w-4" />
                    {opcao.texto}
                  </label>
                ))}
              </div>
            )}

            {questao.tipo === "escolha_multipla" && (
              <div className="space-y-2">
                {opcoes.map((opcao) => (
                  <label key={opcao.id} className="flex items-center gap-2 text-sm text-on-surface">
                    <input type="checkbox" name={`resposta[${questao.id}][]`} value={opcao.id} className="h-4 w-4" />
                    {opcao.texto}
                  </label>
                ))}
              </div>
            )}

            {questao.tipo === "associacao" && (
              <div className="space-y-2">
                {opcoes.map((opcao) => (
                  <div key={opcao.id} className="flex items-center gap-2">
                    <span className="min-w-[140px] text-sm text-on-surface">{opcao.texto}</span>
                    <span className="text-outline">↔</span>
                    <select
                      name={`par[${questao.id}][${opcao.id}]`}
                      required
                      className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary"
                    >
                      <option value="">Selecione...</option>
                      {opcoes.map((o) => (
                        <option key={o.id} value={o.parTexto ?? ""}>
                          {o.parTexto}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {questao.tipo === "dissertativa" && (
              <textarea
                name={`resposta[${questao.id}]`}
                rows={4}
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary"
              />
            )}
          </div>
        );
      })}

      <button
        type="submit"
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90"
      >
        Finalizar prova
      </button>
    </form>
  );
}
