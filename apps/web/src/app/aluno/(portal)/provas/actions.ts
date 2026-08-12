"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  provas,
  capitulos,
  questoes,
  opcoesQuestao,
  tentativasProva,
  respostasAluno,
} from "@/db/schema";
import { authAluno } from "@/lib/auth-aluno";
import { verificarMatriculaAtiva } from "@/lib/acesso-aluno";
import { registrarAuditoria } from "@/lib/audit";

async function materiaIdDaProva(provaId: string): Promise<string | null> {
  const [prova] = await db.select().from(provas).where(eq(provas.id, provaId)).limit(1);
  if (!prova) return null;
  if (prova.materiaId) return prova.materiaId;
  if (prova.capituloId) {
    const [capitulo] = await db.select().from(capitulos).where(eq(capitulos.id, prova.capituloId)).limit(1);
    return capitulo?.materiaId ?? null;
  }
  return null;
}

export async function iniciarTentativa(provaId: string) {
  const session = await authAluno();
  const alunoId = session?.user?.id as string | undefined;
  if (!alunoId) redirect("/aluno/login");
  const alunoNome = session?.user?.name ?? "aluno";

  const materiaId = await materiaIdDaProva(provaId);
  if (!materiaId) redirect("/aluno");

  const temAcesso = await verificarMatriculaAtiva(alunoId, materiaId);
  if (!temAcesso) redirect(`/aluno/materias/${materiaId}`);

  const [emAndamento] = await db
    .select({ id: tentativasProva.id })
    .from(tentativasProva)
    .where(
      and(
        eq(tentativasProva.alunoId, alunoId),
        eq(tentativasProva.provaId, provaId),
        eq(tentativasProva.status, "em_andamento")
      )
    )
    .limit(1);

  if (emAndamento) {
    redirect(`/aluno/provas/${provaId}/tentativa/${emAndamento.id}`);
  }

  const [tentativa] = await db
    .insert(tentativasProva)
    .values({ alunoId, provaId, status: "em_andamento" })
    .returning({ id: tentativasProva.id });

  await registrarAuditoria("criar", "tentativa_prova", tentativa.id, `prova ${provaId} iniciada`, alunoNome);
  redirect(`/aluno/provas/${provaId}/tentativa/${tentativa.id}`);
}

export async function responderTentativa(provaId: string, tentativaId: string, formData: FormData) {
  const session = await authAluno();
  const alunoId = session?.user?.id as string | undefined;
  if (!alunoId) redirect("/aluno/login");
  const alunoNome = session?.user?.name ?? "aluno";

  const [tentativa] = await db
    .select()
    .from(tentativasProva)
    .where(and(eq(tentativasProva.id, tentativaId), eq(tentativasProva.alunoId, alunoId)))
    .limit(1);
  if (!tentativa || tentativa.status !== "em_andamento") redirect(`/aluno/provas/${provaId}`);

  const listaQuestoes = await db.select().from(questoes).where(eq(questoes.provaId, provaId));
  const listaOpcoes = await db.select().from(opcoesQuestao);
  const opcoesPorQuestao = new Map<string, typeof listaOpcoes>();
  for (const opcao of listaOpcoes) {
    const lista = opcoesPorQuestao.get(opcao.questaoId) ?? [];
    lista.push(opcao);
    opcoesPorQuestao.set(opcao.questaoId, lista);
  }

  let temDissertativaPendente = false;

  for (const questao of listaQuestoes) {
    const opcoes = opcoesPorQuestao.get(questao.id) ?? [];

    if (questao.tipo === "escolha_unica" || questao.tipo === "verdadeiro_falso") {
      const opcaoEscolhidaId = String(formData.get(`resposta[${questao.id}]`) ?? "") || null;
      const opcaoCorreta = opcoes.find((o) => o.correta);
      const acertou = !!opcaoEscolhidaId && opcaoCorreta?.id === opcaoEscolhidaId;
      await db.insert(respostasAluno).values({
        tentativaId,
        questaoId: questao.id,
        opcaoEscolhidaId,
        correta: acertou,
        pontosObtidos: acertou ? questao.pontos : 0,
      });
    } else if (questao.tipo === "escolha_multipla") {
      const marcadas = formData.getAll(`resposta[${questao.id}][]`).map((v) => String(v));
      const corretasIds = new Set(opcoes.filter((o) => o.correta).map((o) => o.id));
      const marcadasIds = new Set(marcadas);
      const acertou =
        marcadasIds.size === corretasIds.size && [...marcadasIds].every((id) => corretasIds.has(id));
      await db.insert(respostasAluno).values({
        tentativaId,
        questaoId: questao.id,
        opcoesEscolhidas: marcadas,
        correta: acertou,
        pontosObtidos: acertou ? questao.pontos : 0,
      });
    } else if (questao.tipo === "associacao") {
      const pares = opcoes.map((o) => {
        const direitaEscolhida = String(formData.get(`par[${questao.id}][${o.id}]`) ?? "");
        return { esquerdaId: o.id, direitaTexto: direitaEscolhida };
      });
      const acertou = pares.every((p) => {
        const opcao = opcoes.find((o) => o.id === p.esquerdaId);
        return opcao?.parTexto === p.direitaTexto;
      });
      await db.insert(respostasAluno).values({
        tentativaId,
        questaoId: questao.id,
        paresResposta: pares,
        correta: acertou,
        pontosObtidos: acertou ? questao.pontos : 0,
      });
    } else {
      // dissertativa
      const textoResposta = String(formData.get(`resposta[${questao.id}]`) ?? "").trim();
      temDissertativaPendente = true;
      await db.insert(respostasAluno).values({
        tentativaId,
        questaoId: questao.id,
        textoResposta: textoResposta || null,
        correta: null,
        pontosObtidos: null,
      });
    }
  }

  if (temDissertativaPendente) {
    await db
      .update(tentativasProva)
      .set({ status: "aguardando_correcao", finalizadaEm: new Date() })
      .where(eq(tentativasProva.id, tentativaId));
    await registrarAuditoria(
      "alterar_status",
      "tentativa_prova",
      tentativaId,
      "aguardando correção (dissertativas)",
      alunoNome
    );
  } else {
    const totalObtido = await db
      .select({ pontosObtidos: respostasAluno.pontosObtidos })
      .from(respostasAluno)
      .where(eq(respostasAluno.tentativaId, tentativaId));
    const totalPossivel = listaQuestoes.reduce((soma, q) => soma + q.pontos, 0);
    const somaObtida = totalObtido.reduce((soma, r) => soma + (r.pontosObtidos ?? 0), 0);
    const notaObtida = totalPossivel > 0 ? Math.round((somaObtida / totalPossivel) * 100) : 0;

    await db
      .update(tentativasProva)
      .set({ status: "corrigida", finalizadaEm: new Date(), notaObtida })
      .where(eq(tentativasProva.id, tentativaId));
    await registrarAuditoria(
      "alterar_status",
      "tentativa_prova",
      tentativaId,
      `corrigida automaticamente — nota ${notaObtida}`,
      alunoNome
    );
  }

  redirect(`/aluno/provas/${provaId}/tentativa/${tentativaId}/resultado`);
}
