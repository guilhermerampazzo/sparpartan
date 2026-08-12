import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Trash2, ClipboardList, ClipboardCheck, Pencil } from "lucide-react";
import { db } from "@/db";
import { provas, capitulos, questoes } from "@/db/schema";
import { SectionCard, LinkButton, ConfirmButton, EmptyState, Badge, BackButton } from "@/components/ui";
import { alternarStatusProva, atualizarProva, excluirProva, excluirQuestao } from "../actions";
import { ProvaForm } from "../prova-form";

const TIPO_QUESTAO_LABEL: Record<string, string> = {
  escolha_unica: "Escolha única",
  escolha_multipla: "Escolha múltipla",
  verdadeiro_falso: "Verdadeiro/Falso",
  dissertativa: "Dissertativa",
  associacao: "Associação",
};

export default async function ProvaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [prova] = await db.select().from(provas).where(eq(provas.id, id)).limit(1);
  if (!prova) notFound();

  const capitulo = prova.capituloId
    ? (await db.select().from(capitulos).where(eq(capitulos.id, prova.capituloId)).limit(1))[0]
    : undefined;

  const listaQuestoes = await db.select().from(questoes).where(eq(questoes.provaId, id)).orderBy(asc(questoes.ordem));

  const atualizarComId = atualizarProva.bind(null, id);
  const excluirComId = excluirProva.bind(null, prova.capituloId ?? "", id);
  const alternarStatus = alternarStatusProva.bind(
    null,
    prova.capituloId ?? "",
    id,
    prova.status === "publicado" ? "rascunho" : "publicado"
  );

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/materias" />
      <div className="flex items-center justify-between">
        <div>
          {capitulo && (
            <Link href={`/lms/capitulos/${capitulo.id}`} className="text-body-sm text-outline hover:underline">
              ← {capitulo.titulo}
            </Link>
          )}
          <h1 className="font-display text-headline-lg font-bold text-primary">{prova.titulo}</h1>
        </div>
        <div className="flex items-center gap-2">
          <form action={alternarStatus}>
            <button type="submit">
              <Badge size="sm" tone={prova.status === "publicado" ? "success" : "neutral"}>
                {prova.status === "publicado" ? "Publicado" : "Rascunho"}
              </Badge>
            </button>
          </form>
          <LinkButton href={`/lms/provas/${id}/corrigir`} variant="tonal" icon={ClipboardCheck}>
            Corrigir tentativas
          </LinkButton>
          <form action={excluirComId}>
            <ConfirmButton
              mensagem={`Excluir a prova "${prova.titulo}"? Isso apaga todas as questões dela.`}
              variant="text"
              icon={<Trash2 size={12} />}
            >
              Excluir prova
            </ConfirmButton>
          </form>
        </div>
      </div>

      <ProvaForm
        action={atualizarComId}
        valoresIniciais={{
          titulo: prova.titulo,
          descricao: prova.descricao ?? "",
          notaMinima: prova.notaMinima,
        }}
      />

      <SectionCard title="Questões">
        <div className="space-y-3">
          {listaQuestoes.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nenhuma questão ainda" description="Adicione a primeira questão desta prova." />
          ) : (
            <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
              {listaQuestoes.map((questao) => {
                const excluirQuestaoComId = excluirQuestao.bind(null, id, questao.id);
                return (
                  <li key={questao.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-primary">{questao.enunciado}</p>
                    </div>
                    <Badge size="sm" tone="info">
                      {TIPO_QUESTAO_LABEL[questao.tipo] ?? questao.tipo}
                    </Badge>
                    <Badge size="sm">{questao.pontos} pt{questao.pontos !== 1 ? "s" : ""}</Badge>
                    <Link
                      href={`/lms/provas/${id}/questoes/${questao.id}/editar`}
                      className="p-1.5 text-outline hover:text-primary"
                      title="Editar questão"
                    >
                      <Pencil size={14} />
                    </Link>
                    <form action={excluirQuestaoComId}>
                      <ConfirmButton mensagem="Excluir esta questão?" variant="text" icon={<Trash2 size={12} />}>
                        Excluir
                      </ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          <LinkButton href={`/lms/provas/${id}/questoes/novo`} size="sm">
            + Nova Questão
          </LinkButton>
        </div>
      </SectionCard>
    </div>
  );
}
