"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { provas, questoes, opcoesQuestao, respostasAluno, tentativasProva, certificados } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

type TipoQuestao = "escolha_unica" | "escolha_multipla" | "verdadeiro_falso" | "dissertativa" | "associacao";

export async function criarProva(
  capituloId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const notaMinimaRaw = String(formData.get("notaMinima") ?? "60").trim();
  const notaMinima = Number(notaMinimaRaw) || 60;
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!titulo, "Informe o título da prova.").erro;
  if (erro) return { erro, valores };

  const [prova] = await db
    .insert(provas)
    .values({ capituloId, titulo, descricao: descricao || null, notaMinima })
    .returning({ id: provas.id });

  await registrarAuditoria("criar", "prova", prova.id, titulo);

  redirect(`/lms/provas/${prova.id}`);
}

export async function atualizarProva(
  provaId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const notaMinimaRaw = String(formData.get("notaMinima") ?? "60").trim();
  const notaMinima = Number(notaMinimaRaw) || 60;
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!titulo, "Informe o título da prova.").erro;
  if (erro) return { erro, valores };

  await db
    .update(provas)
    .set({ titulo, descricao: descricao || null, notaMinima })
    .where(eq(provas.id, provaId));

  await registrarAuditoria("atualizar", "prova", provaId, titulo);

  redirect(`/lms/provas/${provaId}`);
}

export async function alternarStatusProva(
  capituloId: string,
  provaId: string,
  status: "rascunho" | "publicado"
) {
  await db.update(provas).set({ status }).where(eq(provas.id, provaId));
  await registrarAuditoria("atualizar", "prova", provaId, status);
  redirect(`/lms/capitulos/${capituloId}`);
}

export async function excluirProva(capituloId: string, provaId: string) {
  await db.delete(provas).where(eq(provas.id, provaId));
  await registrarAuditoria("excluir", "prova", provaId);
  redirect(`/lms/capitulos/${capituloId}`);
}

type NovaOpcao = { texto: string; parTexto: string | null; correta: boolean; ordem: number };

/**
 * Monta as opções de uma questão de acordo com o tipo, validando antes de gravar nada.
 * Reaproveitada por criarQuestao e atualizarQuestao para não duplicar a lógica.
 */
function montarOpcoes(tipo: TipoQuestao, formData: FormData): { opcoes: NovaOpcao[] } | { erro: string } {
  if (tipo === "verdadeiro_falso") {
    const correta = String(formData.get("respostaVf") ?? "verdadeiro");
    return {
      opcoes: [
        { texto: "Verdadeiro", parTexto: null, correta: correta === "verdadeiro", ordem: 1 },
        { texto: "Falso", parTexto: null, correta: correta === "falso", ordem: 2 },
      ],
    };
  }

  if (tipo === "escolha_unica" || tipo === "escolha_multipla") {
    const textos = formData.getAll("opcaoTexto[]").map((v) => String(v).trim());
    const corretasMarcadas = new Set(formData.getAll("opcaoCorreta[]").map((v) => String(v)));
    const opcoes = textos
      .map((texto, i) => ({ texto, parTexto: null, correta: corretasMarcadas.has(String(i)), ordem: i + 1 }))
      .filter((o) => !!o.texto);

    if (opcoes.length < 2) return { erro: "Adicione pelo menos duas opções." };
    if (!opcoes.some((o) => o.correta)) return { erro: "Marque ao menos uma opção correta." };
    return { opcoes };
  }

  if (tipo === "associacao") {
    const esquerdas = formData.getAll("parEsquerda[]").map((v) => String(v).trim());
    const direitas = formData.getAll("parDireita[]").map((v) => String(v).trim());
    const opcoes = esquerdas
      .map((texto, i) => ({ texto, parTexto: direitas[i] ?? "", correta: true, ordem: i + 1 }))
      .filter((o) => !!o.texto && !!o.parTexto);

    if (opcoes.length < 2) return { erro: "Adicione pelo menos dois pares." };
    return { opcoes };
  }

  // dissertativa: sem opções.
  return { opcoes: [] };
}

export async function criarQuestao(
  provaId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const enunciado = String(formData.get("enunciado") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "") as TipoQuestao;
  const pontosRaw = String(formData.get("pontos") ?? "1").trim();
  const pontos = Number(pontosRaw) || 1;
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!enunciado, "Informe o enunciado da questão.")
    .exigir(
      ["escolha_unica", "escolha_multipla", "verdadeiro_falso", "dissertativa", "associacao"].includes(tipo),
      "Selecione o tipo da questão."
    ).erro;
  if (erro) return { erro, valores };

  const resultadoOpcoes = montarOpcoes(tipo, formData);
  if ("erro" in resultadoOpcoes) return { erro: resultadoOpcoes.erro, valores };
  const novasOpcoes = resultadoOpcoes.opcoes;

  const [{ maxOrdem }] = await db
    .select({ maxOrdem: sql<number>`coalesce(max(${questoes.ordem}), 0)` })
    .from(questoes)
    .where(eq(questoes.provaId, provaId));

  const [questao] = await db
    .insert(questoes)
    .values({ provaId, enunciado, tipo, ordem: maxOrdem + 1, pontos })
    .returning({ id: questoes.id });

  if (novasOpcoes.length > 0) {
    await db.insert(opcoesQuestao).values(
      novasOpcoes.map((o) => ({
        questaoId: questao.id,
        texto: o.texto,
        parTexto: o.parTexto,
        correta: o.correta,
        ordem: o.ordem,
      }))
    );
  }

  await registrarAuditoria("criar", "questao", questao.id, enunciado.slice(0, 80));

  redirect(`/lms/provas/${provaId}`);
}

export async function excluirQuestao(provaId: string, questaoId: string) {
  await db.delete(questoes).where(eq(questoes.id, questaoId));
  await registrarAuditoria("excluir", "questao", questaoId);
  redirect(`/lms/provas/${provaId}`);
}

export async function atualizarQuestao(
  provaId: string,
  questaoId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const enunciado = String(formData.get("enunciado") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "") as TipoQuestao;
  const pontosRaw = String(formData.get("pontos") ?? "1").trim();
  const pontos = Number(pontosRaw) || 1;
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!enunciado, "Informe o enunciado da questão.")
    .exigir(
      ["escolha_unica", "escolha_multipla", "verdadeiro_falso", "dissertativa", "associacao"].includes(tipo),
      "Selecione o tipo da questão."
    ).erro;
  if (erro) return { erro, valores };

  const resultadoOpcoes = montarOpcoes(tipo, formData);
  if ("erro" in resultadoOpcoes) return { erro: resultadoOpcoes.erro, valores };
  const novasOpcoes = resultadoOpcoes.opcoes;

  await db.transaction(async (tx) => {
    await tx.update(questoes).set({ enunciado, tipo, pontos }).where(eq(questoes.id, questaoId));
    await tx.delete(opcoesQuestao).where(eq(opcoesQuestao.questaoId, questaoId));
    if (novasOpcoes.length > 0) {
      await tx.insert(opcoesQuestao).values(
        novasOpcoes.map((o) => ({
          questaoId,
          texto: o.texto,
          parTexto: o.parTexto,
          correta: o.correta,
          ordem: o.ordem,
        }))
      );
    }
  });

  await registrarAuditoria("atualizar", "questao", questaoId, enunciado.slice(0, 80));

  redirect(`/lms/provas/${provaId}`);
}

/**
 * Correção manual das dissertativas de uma tentativa: recebe `pontos[<respostaId>]`
 * do form, grava pontosObtidos + correta por resposta, recalcula a nota da tentativa
 * como % da pontuação total possível da prova e marca como corrigida.
 */
export async function corrigirTentativa(provaId: string, tentativaId: string, formData: FormData) {
  const respostas = await db
    .select({ id: respostasAluno.id, questaoId: respostasAluno.questaoId, pontosAtuais: respostasAluno.pontosObtidos })
    .from(respostasAluno)
    .where(eq(respostasAluno.tentativaId, tentativaId));

  for (const resposta of respostas) {
    const valorCampo = formData.get(`pontos[${resposta.id}]`);
    if (valorCampo === null) continue;
    const pontosObtidos = Number(valorCampo) || 0;
    await db
      .update(respostasAluno)
      .set({ pontosObtidos, correta: pontosObtidos > 0 })
      .where(eq(respostasAluno.id, resposta.id));
  }

  const todasRespostas = await db
    .select({ pontosObtidos: respostasAluno.pontosObtidos })
    .from(respostasAluno)
    .where(eq(respostasAluno.tentativaId, tentativaId));

  const totalObtido = todasRespostas.reduce((soma, r) => soma + (r.pontosObtidos ?? 0), 0);

  const todasQuestoes = await db
    .select({ pontos: questoes.pontos })
    .from(questoes)
    .where(eq(questoes.provaId, provaId));

  const totalPossivel = todasQuestoes.reduce((soma, q) => soma + q.pontos, 0);
  const notaObtida = totalPossivel > 0 ? Math.round((totalObtido / totalPossivel) * 100) : 0;

  await db
    .update(tentativasProva)
    .set({ notaObtida, status: "corrigida", finalizadaEm: new Date() })
    .where(eq(tentativasProva.id, tentativaId));

  await registrarAuditoria("atualizar", "tentativa_prova", tentativaId, `Nota: ${notaObtida}%`);

  // Aprovação gera automaticamente um certificado "para emitir" — a Central
  // Operacional é alimentada sem trabalho manual.
  const [provaInfo] = await db.select({ materiaId: provas.materiaId, notaMinima: provas.notaMinima }).from(provas).where(eq(provas.id, provaId)).limit(1);
  const [tentativaInfo] = await db.select({ alunoId: tentativasProva.alunoId }).from(tentativasProva).where(eq(tentativasProva.id, tentativaId)).limit(1);
  if (provaInfo && tentativaInfo && notaObtida >= (provaInfo.notaMinima ?? 60)) {
    const jaExiste = await db
      .select({ id: certificados.id })
      .from(certificados)
      .where(eq(certificados.tentativaId, tentativaId))
      .limit(1);
    if (jaExiste.length === 0) {
      await db.insert(certificados).values({
        alunoId: tentativaInfo.alunoId,
        materiaId: provaInfo.materiaId,
        provaId,
        tentativaId,
        origem: "auto",
        criadoPorId: await idUsuarioEquipe(),
      });
      await registrarAuditoria("criar", "certificado", "", `auto — tentativa ${tentativaId}`);
    }
  }

  redirect(`/lms/provas/${provaId}/corrigir`);
}

export async function capituloDaProva(provaId: string): Promise<string | null> {
  const [linha] = await db
    .select({ capituloId: provas.capituloId })
    .from(provas)
    .where(eq(provas.id, provaId))
    .limit(1);
  return linha?.capituloId ?? null;
}
