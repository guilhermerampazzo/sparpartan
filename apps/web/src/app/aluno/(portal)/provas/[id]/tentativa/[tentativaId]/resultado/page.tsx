import { asc, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { db } from "@/db";
import { provas, questoes, tentativasProva, respostasAluno } from "@/db/schema";
import { authAluno } from "@/lib/auth-aluno";

import { BackButton } from "@/components/ui";

export default async function ResultadoTentativaPage({
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

  const listaQuestoes = await db
    .select()
    .from(questoes)
    .where(eq(questoes.provaId, id))
    .orderBy(asc(questoes.ordem));

  const respostas = await db.select().from(respostasAluno).where(eq(respostasAluno.tentativaId, tentativaId));
  const respostaPorQuestao = new Map(respostas.map((r) => [r.questaoId, r]));

  const aprovado = tentativa.notaObtida !== null && tentativa.notaObtida >= prova.notaMinima;

  return (
      <div className="mx-auto max-w-2xl space-y-6">
      <BackButton href="/aluno" />
      <div>
        <Link href={`/aluno/provas/${id}`} className="text-body-sm text-outline hover:underline">
          ← {prova.titulo}
        </Link>
        <h2 className="font-display text-headline-md font-bold text-primary">Resultado</h2>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        {tentativa.status === "aguardando_correcao" ? (
          <p className="flex items-center gap-2 text-sm text-warning">
            <HelpCircle size={16} /> Aguardando correção do professor (há questões dissertativas pendentes).
          </p>
        ) : (
          <>
            <p className="text-title-lg font-bold text-primary">Nota: {tentativa.notaObtida}%</p>
            <p className={`flex items-center gap-2 text-sm ${aprovado ? "text-success" : "text-danger"}`}>
              {aprovado ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {aprovado ? "Aprovado" : "Reprovado"} (nota mínima: {prova.notaMinima}%)
            </p>
          </>
        )}
      </div>

      <div className="space-y-3">
        {listaQuestoes.map((questao, indice) => {
          const resposta = respostaPorQuestao.get(questao.id);
          const objetiva = questao.tipo !== "dissertativa";
          return (
            <div key={questao.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="mb-1 text-sm font-medium text-primary">
                {indice + 1}. {questao.enunciado}
              </p>
              {objetiva ? (
                <p className={`flex items-center gap-2 text-body-sm ${resposta?.correta ? "text-success" : "text-danger"}`}>
                  {resposta?.correta ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {resposta?.correta ? "Correta" : "Incorreta"}
                </p>
              ) : (
                <p className="text-body-sm text-outline">
                  {resposta?.pontosObtidos !== null && resposta?.pontosObtidos !== undefined
                    ? `Corrigida: ${resposta.pontosObtidos}/${questao.pontos} pts`
                    : "Aguardando correção manual."}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
