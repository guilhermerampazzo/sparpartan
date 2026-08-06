import { asc, eq, notInArray, desc, ilike } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Trash2, BookOpen } from "lucide-react";
import { db } from "@/db";
import { alunos, matriculas, materias, agendaEventos, clientes, tentativasProva, provas } from "@/db/schema";
import { Badge, SectionCard, ConfirmButton, EmptyState, StatusBadge, BackButton } from "@/components/ui";
import { atualizarAluno, concederAcesso, revogarAcesso } from "../actions";
import { AlunoEditForm } from "./aluno-edit-form";
import { ConcederAcessoForm } from "./conceder-acesso-form";
import { statusEvento } from "@/lib/status";

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "warning" | "neutral" }> = {
  ativo: { label: "Ativo", tone: "success" },
  expirado: { label: "Expirado", tone: "warning" },
  revogado: { label: "Revogado", tone: "neutral" },
};

const ORIGEM_LABEL: Record<string, string> = {
  manual: "Manual",
  mercadopago: "Mercado Pago",
};

export default async function AlunoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [aluno] = await db.select().from(alunos).where(eq(alunos.id, id)).limit(1);
  if (!aluno) notFound();

  const listaMatriculas = await db
    .select({
      id: matriculas.id,
      status: matriculas.status,
      origem: matriculas.origem,
      liberadoEm: matriculas.liberadoEm,
      expiraEm: matriculas.expiraEm,
      materiaTitulo: materias.titulo,
      materiaId: materias.id,
    })
    .from(matriculas)
    .innerJoin(materias, eq(matriculas.materiaId, materias.id))
    .where(eq(matriculas.alunoId, id))
    .orderBy(asc(materias.titulo));

  const idsMatriculadosAtivos = listaMatriculas.filter((m) => m.status === "ativo").map((m) => m.materiaId);

  const materiasDisponiveis = await db
    .select({ id: materias.id, titulo: materias.titulo })
    .from(materias)
    .where(idsMatriculadosAtivos.length > 0 ? notInArray(materias.id, idsMatriculadosAtivos) : undefined)
    .orderBy(asc(materias.titulo));

  // Provas agendadas: o aluno compartilha e-mail com o cliente — as provas da
  // agenda do cliente aparecem como "aulas/provas" do aluno.
  const [clienteVinculado] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(ilike(clientes.email, aluno.email))
    .limit(1);

  const proximasProvas = clienteVinculado
    ? await db
        .select({
          id: agendaEventos.id,
          titulo: agendaEventos.titulo,
          dataHora: agendaEventos.dataHora,
          status: agendaEventos.status,
        })
        .from(agendaEventos)
        .where(eq(agendaEventos.clienteId, clienteVinculado.id))
        .orderBy(desc(agendaEventos.dataHora))
        .limit(5)
    : [];

  const tentativas = await db
    .select({
      id: tentativasProva.id,
      status: tentativasProva.status,
      notaObtida: tentativasProva.notaObtida,
      finalizadaEm: tentativasProva.finalizadaEm,
      provaTitulo: provas.titulo,
      notaMinima: provas.notaMinima,
    })
    .from(tentativasProva)
    .innerJoin(provas, eq(tentativasProva.provaId, provas.id))
    .where(eq(tentativasProva.alunoId, id))
    .orderBy(desc(tentativasProva.iniciadaEm))
    .limit(10);

  const atualizarComId = atualizarAluno.bind(null, id);
  const concederComId = concederAcesso.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/alunos" />
      <h1 className="font-display text-headline-lg font-bold text-primary">{aluno.nome}</h1>

      <SectionCard title="Dados do aluno">
        <div className="mb-4 grid grid-cols-1 gap-2 text-body-sm text-outline sm:grid-cols-3">
          <p>
            E-mail: <span className="text-primary">{aluno.email}</span>
          </p>
          <p>
            Cidade: <span className="text-primary">{aluno.cidade ?? "—"}</span>
          </p>
          <p>
            Telefone: <span className="text-primary">{aluno.telefone ?? "—"}</span>
          </p>
        </div>
        <AlunoEditForm action={atualizarComId} telefone={aluno.telefone ?? ""} cidade={aluno.cidade ?? ""} ativo={aluno.ativo} />
      </SectionCard>

      <SectionCard title="Matrículas">
        <div className="space-y-4">
          {listaMatriculas.length === 0 ? (
            <EmptyState icon={BookOpen} title="Nenhuma matrícula ainda" description="Conceda acesso a uma matéria abaixo." />
          ) : (
            <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
              {listaMatriculas.map((m) => {
                const statusInfo = STATUS_LABEL[m.status] ?? { label: m.status, tone: "neutral" as const };
                const revogarComId = revogarAcesso.bind(null, id, m.id);
                return (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-primary">{m.materiaTitulo}</span>
                      <p className="text-body-sm text-outline">
                        Liberado em {new Date(m.liberadoEm).toLocaleDateString("pt-BR")} ·{" "}
                        {m.expiraEm ? `Expira em ${new Date(m.expiraEm).toLocaleDateString("pt-BR")}` : "Sem limite"}
                      </p>
                    </div>
                    <Badge tone={statusInfo.tone} size="sm">{statusInfo.label}</Badge>
                    <Badge tone="neutral" size="sm">{ORIGEM_LABEL[m.origem] ?? m.origem}</Badge>
                    {m.status === "ativo" && (
                      <form action={revogarComId}>
                        <ConfirmButton
                          mensagem={`Revogar acesso de ${aluno.nome} à matéria "${m.materiaTitulo}"?`}
                          variant="text"
                          icon={<Trash2 size={12} />}
                        >
                          Revogar
                        </ConfirmButton>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-outline-variant pt-4">
            <h3 className="mb-3 font-display text-body-md font-semibold text-primary">Conceder Acesso</h3>
            <ConcederAcessoForm action={concederComId} materiasDisponiveis={materiasDisponiveis} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Provas e resultados">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 font-mono-caps text-label-sm uppercase tracking-wide text-outline">
              Provas agendadas (agenda)
            </p>
            {proximasProvas.length === 0 ? (
              <p className="text-body-sm text-outline">
                Nenhuma prova na agenda{clienteVinculado ? "" : " — vincule o e-mail do aluno a um cliente para a agenda ser compartilhada"}.
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
                {proximasProvas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-body-md text-primary">{p.titulo}</p>
                      <p className="text-body-sm text-outline">
                        {new Date(p.dataHora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                    <StatusBadge status={statusEvento(p.status)} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-2 font-mono-caps text-label-sm uppercase tracking-wide text-outline">
              Tentativas recentes
            </p>
            {tentativas.length === 0 ? (
              <p className="text-body-sm text-outline">Nenhuma tentativa registrada ainda.</p>
            ) : (
              <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
                {tentativas.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-body-md text-primary">
                        {t.provaTitulo}
                        {t.notaObtida !== null && (
                          <span className="ml-2 text-body-sm text-outline">
                            nota {t.notaObtida}/{t.notaMinima ?? 100}
                          </span>
                        )}
                      </p>
                      <p className="text-body-sm text-outline">
                        {t.finalizadaEm ? new Date(t.finalizadaEm).toLocaleDateString("pt-BR") : "em andamento"}
                      </p>
                    </div>
                    <Badge
                      tone={
                        t.status === "corrigida"
                          ? t.notaObtida !== null && t.notaObtida >= (t.notaMinima ?? 60)
                            ? "success"
                            : "danger"
                          : t.status === "aguardando_correcao"
                            ? "warning"
                            : "info"
                      }
                      size="sm"
                    >
                      {t.status === "corrigida"
                        ? t.notaObtida !== null && t.notaObtida >= (t.notaMinima ?? 60)
                          ? "Aprovado"
                          : "Reprovado"
                        : t.status === "aguardando_correcao"
                          ? "Aguardando correção"
                          : "Em andamento"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
