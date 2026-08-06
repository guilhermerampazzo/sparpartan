import Link from "next/link";
import { asc, eq, gte, and, ne, lt, count, desc } from "drizzle-orm";
import { BookOpen, UserCog, GraduationCap, CalendarClock, ClipboardCheck, BadgeX, UsersRound, ScrollText } from "lucide-react";
import { db } from "@/db";
import { alunos, agendaEventos, clientes, tentativasProva, provas } from "@/db/schema";
import { StatCard, Badge, EmptyState } from "@/components/ui";
import { SectionCard } from "@/components/ui/form-field";

const CARTOES = [
  {
    href: "/lms/materias",
    icon: BookOpen,
    title: "LMS",
    description: "Matérias, capítulos, aulas, provas e correção automática do curso náutico.",
  },
  {
    href: "/alunos",
    icon: UserCog,
    title: "Alunos",
    description: "Cadastro de alunos, matrículas, pedidos de pagamento e acesso ao portal.",
  },
  {
    href: "/escola/turmas",
    icon: UsersRound,
    title: "Turmas",
    description: "Turmas abertas do curso — alimentam a Central Operacional.",
  },
  {
    href: "/escola/certificados",
    icon: ScrollText,
    title: "Certificados",
    description: "Certificados para emitir e emitidos — aprovados em provas geram automaticamente.",
  },
  {
    href: "/area-de-estudos",
    icon: GraduationCap,
    title: "Área de Estudos",
    description: "Materiais liberados por serviço contratado e progresso de cada cliente.",
  },
];

export default async function EscolaPage() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [[{ totalAlunosAtivos }], [{ aguardandoCorrecao }], [{ reprovados }], provasAgendadas, resultadosRecentes] =
    await Promise.all([
      db.select({ totalAlunosAtivos: count() }).from(alunos).where(eq(alunos.ativo, true)),
      db
        .select({ aguardandoCorrecao: count() })
        .from(tentativasProva)
        .where(eq(tentativasProva.status, "aguardando_correcao")),
      db
        .select({ reprovados: count() })
        .from(tentativasProva)
        .innerJoin(provas, eq(tentativasProva.provaId, provas.id))
        .where(and(eq(tentativasProva.status, "corrigida"), lt(tentativasProva.notaObtida, provas.notaMinima))),
      db
        .select({
          id: agendaEventos.id,
          titulo: agendaEventos.titulo,
          dataHora: agendaEventos.dataHora,
          status: agendaEventos.status,
          clienteNome: clientes.nome,
          clienteCidade: clientes.cidade,
        })
        .from(agendaEventos)
        .leftJoin(clientes, eq(agendaEventos.clienteId, clientes.id))
        .where(and(eq(agendaEventos.tipo, "prova"), ne(agendaEventos.status, "cancelado"), gte(agendaEventos.dataHora, hoje)))
        .orderBy(asc(agendaEventos.dataHora)),
      db
        .select({
          id: tentativasProva.id,
          finalizadaEm: tentativasProva.finalizadaEm,
          notaObtida: tentativasProva.notaObtida,
          provaTitulo: provas.titulo,
          notaMinima: provas.notaMinima,
          alunoNome: alunos.nome,
          alunoCidade: alunos.cidade,
        })
        .from(tentativasProva)
        .innerJoin(provas, eq(tentativasProva.provaId, provas.id))
        .innerJoin(alunos, eq(tentativasProva.alunoId, alunos.id))
        .where(eq(tentativasProva.status, "corrigida"))
        .orderBy(desc(tentativasProva.finalizadaEm))
        .limit(20),
    ]);

  const provasPorCidade = new Map<string, typeof provasAgendadas>();
  for (const p of provasAgendadas) {
    const cidade = p.clienteCidade ?? "Sem cidade";
    const lista = provasPorCidade.get(cidade) ?? [];
    lista.push(p);
    provasPorCidade.set(cidade, lista);
  }

  const resultadosPorCidade = new Map<string, typeof resultadosRecentes>();
  for (const r of resultadosRecentes) {
    const cidade = r.alunoCidade ?? "Sem cidade";
    const lista = resultadosPorCidade.get(cidade) ?? [];
    lista.push(r);
    resultadosPorCidade.set(cidade, lista);
  }

  return (
    <div className="space-y-gutter">
      <div>
        <h1 className="font-display text-headline-lg font-bold text-primary">Escola Náutica</h1>
        <p className="text-body-md text-on-surface-variant">
          Módulo de ensino: materiais, aulas, provas, alunos e área de estudos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
        {CARTOES.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="rounded-pill bg-primary-container p-2.5 text-on-primary-container">
              <c.icon size={22} />
            </span>
            <div>
              <h2 className="font-display text-title-md font-semibold text-primary">{c.title}</h2>
              <p className="text-body-sm text-on-surface-variant">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-gutter lg:grid-cols-4">
        <StatCard label="Alunos ativos" value={totalAlunosAtivos} icon={GraduationCap} tone="info" href="/alunos" />
        <StatCard
          label="Provas agendadas"
          value={provasAgendadas.length}
          icon={CalendarClock}
          tone={provasAgendadas.length > 0 ? "warning" : "success"}
          href="/agenda"
        />
        <StatCard
          label="Aguardando correção"
          value={aguardandoCorrecao}
          icon={ClipboardCheck}
          tone={aguardandoCorrecao > 0 ? "warning" : "success"}
          href="/lms/provas"
        />
        <StatCard
          label="Reprovados"
          value={reprovados}
          icon={BadgeX}
          tone={reprovados > 0 ? "danger" : "success"}
          href="/lms/provas"
        />
      </div>

      <SectionCard title={`Próximas provas agendadas (${provasAgendadas.length})`}>
        {provasAgendadas.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhuma prova agendada" description="Agende uma prova em Agenda → Novo Evento (tipo Prova)." />
        ) : (
          <div className="space-y-6">
            {[...provasPorCidade.entries()].map(([cidade, itens]) => (
              <div key={cidade}>
                <p className="mb-2 font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                  {cidade} · {itens.length} prova(s)
                </p>
                <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
                  {itens.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-body-md text-primary">{p.titulo}</p>
                        <p className="text-body-sm text-outline">
                          {new Date(p.dataHora).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
                          {p.clienteNome && ` — ${p.clienteNome}`}
                        </p>
                      </div>
                      <Badge tone={p.status === "pendente" ? "warning" : "info"} size="sm">
                        {p.status === "pendente" ? "Aguardando" : p.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title={`Resultados recentes (${resultadosRecentes.length})`}>
        {resultadosRecentes.length === 0 ? (
          <EmptyState icon={GraduationCap} title="Nenhuma prova corrigida ainda" />
        ) : (
          <div className="space-y-6">
            {[...resultadosPorCidade.entries()].map(([cidade, itens]) => (
              <div key={cidade}>
                <p className="mb-2 font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                  {cidade} · {itens.length} resultado(s)
                </p>
                <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
                  {itens.map((r) => {
                    const aprovado = r.notaObtida !== null && r.notaObtida >= (r.notaMinima ?? 60);
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-body-md text-primary">
                            {r.alunoNome} — {r.provaTitulo}
                          </p>
                          <p className="text-body-sm text-outline">
                            {r.finalizadaEm ? new Date(r.finalizadaEm).toLocaleDateString("pt-BR") : ""} · nota {r.notaObtida ?? "—"}/{r.notaMinima ?? 100}
                          </p>
                        </div>
                        <Badge tone={aprovado ? "success" : "danger"} size="sm">
                          {aprovado ? "Aprovado" : "Reprovado"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
