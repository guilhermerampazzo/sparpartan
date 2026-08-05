import Link from "next/link";
import { and, asc, count, desc, eq, gte, isNull, lt, lte, ne, sql } from "drizzle-orm";
import {
  Users,
  Ship,
  FolderClock,
  FileWarning,
  CalendarClock,
  Receipt,
  UserPlus,
  FileText,
  CalendarPlus,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/db";
import {
  clientes,
  embarcacoes,
  processos,
  documentosGerados,
  modelosDocumento,
  agendaEventos,
  lembretes,
  orcamentos,
  pagamentos,
  servicosContratados,
  usuarios,
} from "@/db/schema";
import { Suspense } from "react";
import { StatCard, AlertCard, Badge, EmptyState, BarChart } from "@/components/ui";
import { tipoEvento, infoUrgencia, urgenciaVencimento, rotuloPrazo, ordenarPorUrgencia } from "@/lib/status";
import { AvisoAcessoNegado } from "@/components/layout/aviso-acesso-negado";

export default async function HomePage() {
  const hoje = new Date();
  const inicioHoje = new Date(hoje);
  inicioHoje.setHours(0, 0, 0, 0);
  const fimHoje = new Date(inicioHoje);
  fimHoje.setDate(fimHoje.getDate() + 1);
  const em30 = new Date(inicioHoje);
  em30.setDate(em30.getDate() + 30);
  const em30Str = em30.toISOString().slice(0, 10);

  const [
    [{ n: totalClientes }],
    [{ n: totalEmbarcacoes }],
    [{ n: processosAtivos }],
    [{ n: docsPendentes }],
    [{ n: pagamentosAtrasados }],
    documentosVencendo,
    eventosHoje,
    lembretesAbertos,
    sazonalidade,
  ] = await Promise.all([
    db.select({ n: count() }).from(clientes).where(isNull(clientes.excluidoEm)),
    db.select({ n: count() }).from(embarcacoes),
    db
      .select({ n: count() })
      .from(processos)
      .where(and(ne(processos.status, "concluido"), ne(processos.status, "cancelado"))),
    db.select({ n: count() }).from(processos).where(eq(processos.status, "documentos_pendentes")),
    db.select({ n: count() }).from(pagamentos).where(eq(pagamentos.status, "atrasado")),
    db
      .select({
        id: documentosGerados.id,
        titulo: modelosDocumento.nome,
        clienteNome: clientes.nome,
        data: documentosGerados.vencimento,
      })
      .from(documentosGerados)
      .innerJoin(modelosDocumento, eq(documentosGerados.modeloId, modelosDocumento.id))
      .innerJoin(clientes, eq(documentosGerados.clienteId, clientes.id))
      .where(and(sql`${documentosGerados.vencimento} is not null`, lte(documentosGerados.vencimento, em30Str)))
      .limit(20),
    db
      .select({
        id: agendaEventos.id,
        titulo: agendaEventos.titulo,
        dataHora: agendaEventos.dataHora,
        tipo: agendaEventos.tipo,
        clienteNome: clientes.nome,
      })
      .from(agendaEventos)
      .leftJoin(clientes, eq(agendaEventos.clienteId, clientes.id))
      .where(
        and(
          gte(agendaEventos.dataHora, inicioHoje),
          lt(agendaEventos.dataHora, fimHoje),
          ne(agendaEventos.status, "cancelado")
        )
      )
      .orderBy(asc(agendaEventos.dataHora)),
    db
      .select({
        id: lembretes.id,
        mensagem: lembretes.mensagem,
        clienteNome: clientes.nome,
      })
      .from(lembretes)
      .leftJoin(clientes, eq(lembretes.clienteId, clientes.id))
      .where(eq(lembretes.resolvido, false))
      .orderBy(desc(lembretes.dataLembrete))
      .limit(6),
    db
      .select({
        mes: sql<string>`to_char(${servicosContratados.dataContratacao}, 'Mon')`,
        n: count(),
      })
      .from(servicosContratados)
      .where(gte(servicosContratados.dataContratacao, sql`current_date - interval '6 months'`))
      .groupBy(sql`to_char(${servicosContratados.dataContratacao}, 'Mon'), date_trunc('month', ${servicosContratados.dataContratacao})`)
      .orderBy(sql`date_trunc('month', ${servicosContratados.dataContratacao})`),
  ]);

  const vencimentosOrdenados = ordenarPorUrgencia(documentosVencendo).filter(
    (d) => urgenciaVencimento(d.data) !== "sem_data"
  );
  const vencidosOuCriticos = vencimentosOrdenados.filter((d) =>
    ["vencido", "critico"].includes(urgenciaVencimento(d.data))
  );

  const orcamentosPendentesRows = await db
    .select({ n: count() })
    .from(orcamentos)
    .where(eq(orcamentos.status, "pendente"));
  const orcamentosPendentes = orcamentosPendentesRows[0]?.n ?? 0;

  const andamentoPorColaborador = await db
    .select({
      colaboradorNome: usuarios.nome,
      aguardando: sql<number>`count(*) filter (where ${processos.status} in ('aberto', 'documentos_pendentes', 'pronto_para_protocolo'))::int`,
      protocolado: sql<number>`count(*) filter (where ${processos.status} = 'protocolado')::int`,
      finalizados: sql<number>`count(*) filter (where ${processos.status} = 'concluido')::int`,
    })
    .from(processos)
    .innerJoin(usuarios, eq(processos.responsavelId, usuarios.id))
    .groupBy(usuarios.id, usuarios.nome)
    .orderBy(usuarios.nome);

  const alertas: { tone: "danger" | "warning"; title: string; description?: string; href: string }[] = [];
  if (docsPendentes > 0) {
    alertas.push({
      tone: "warning",
      title: `${docsPendentes} processo(s) com documentos pendentes`,
      description: "Faltam documentos obrigatórios para poder protocolar.",
      href: "/processos",
    });
  }
  if (pagamentosAtrasados > 0) {
    alertas.push({
      tone: "danger",
      title: `${pagamentosAtrasados} pagamento(s) atrasado(s)`,
      href: "/vendas",
    });
  }
  if (vencidosOuCriticos.length > 0) {
    alertas.push({
      tone: "danger",
      title: `${vencidosOuCriticos.length} documento(s) vencendo em até 7 dias (ou vencidos)`,
      href: "/documentos/vencimentos",
    });
  }
  if (lembretesAbertos.length > 0) {
    alertas.push({
      tone: "warning",
      title: `${lembretesAbertos.length} lembrete(s) sem resolver`,
      href: "/lembretes",
    });
  }

  const nomeUsuario = "de volta";

  return (
    <div className="space-y-gutter">
      <Suspense fallback={null}>
        <AvisoAcessoNegado />
      </Suspense>
      <div>
        <h1 className="font-display text-headline-lg font-bold text-primary">
          Bem-vindo {nomeUsuario}
        </h1>
        <p className="text-body-md text-on-surface-variant">
          {hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {alertas.length > 0 ? (
        <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2">
          {alertas.map((a) => (
            <AlertCard
              key={a.title}
              tone={a.tone}
              title={a.title}
              description={a.description}
              action={{ label: "Ver", href: a.href }}
            />
          ))}
        </div>
      ) : (
        <AlertCard tone="success" title="Tudo em dia" description="Nenhuma pendência crítica no momento." />
      )}

      <div className="grid grid-cols-2 gap-gutter lg:grid-cols-3">
        <StatCard label="Clientes" value={totalClientes} icon={Users} tone="info" href="/clientes" />
        <StatCard label="Embarcações" value={totalEmbarcacoes} icon={Ship} tone="info" href="/embarcacoes" />
        <StatCard
          label="Processos Ativos"
          value={processosAtivos}
          icon={FolderClock}
          tone="info"
          href="/processos"
        />
        <StatCard
          label="Documentos Pendentes"
          value={docsPendentes}
          icon={FileWarning}
          tone={docsPendentes > 0 ? "warning" : "success"}
          href="/processos"
        />
        <StatCard
          label="Vencendo em 30 dias"
          value={vencimentosOrdenados.length}
          icon={CalendarClock}
          tone={vencimentosOrdenados.length > 0 ? "warning" : "success"}
          href="/documentos/vencimentos"
        />
        <StatCard
          label="Orçamentos Pendentes"
          value={orcamentosPendentes}
          icon={Receipt}
          tone="info"
          href="/orcamentos"
        />
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-2">
          <h2 className="mb-4 font-display text-title-lg font-semibold text-primary">
            Próximos Vencimentos
          </h2>
          {vencimentosOrdenados.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="Nada vencendo nos próximos 30 dias" />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {vencimentosOrdenados.slice(0, 8).map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <Link href={`/documentos/${d.id}`} className="text-body-md font-medium text-primary hover:underline">
                      {d.titulo}
                    </Link>
                    <p className="text-body-sm text-outline">{d.clienteNome}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-body-sm text-outline">{d.data && rotuloPrazo(d.data)}</span>
                    <Badge tone={infoUrgencia(urgenciaVencimento(d.data)).tone} icon={infoUrgencia(urgenciaVencimento(d.data)).icon} size="sm">
                      {infoUrgencia(urgenciaVencimento(d.data)).label}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-gutter">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <h2 className="mb-4 font-display text-title-lg font-semibold text-primary">Agenda de Hoje</h2>
            {eventosHoje.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Nenhum evento hoje" />
            ) : (
              <ul className="space-y-3">
                {eventosHoje.map((e) => (
                  <li key={e.id} className="flex items-start gap-3">
                    <span className="mt-0.5 font-mono-caps text-label-sm text-outline">
                      {new Date(e.dataHora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-md text-primary">{e.titulo}</p>
                      {e.clienteNome && <p className="text-body-sm text-outline">{e.clienteNome}</p>}
                    </div>
                    <Badge tone={tipoEvento(e.tipo).tone} icon={tipoEvento(e.tipo).icon} size="sm">
                      {tipoEvento(e.tipo).label}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lembretesAbertos.length > 0 && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
              <h2 className="mb-4 font-display text-title-lg font-semibold text-primary">Lembretes</h2>
              <ul className="space-y-2">
                {lembretesAbertos.map((l) => (
                  <li key={l.id} className="text-body-sm">
                    <p className="text-primary">{l.mensagem}</p>
                    {l.clienteNome && <p className="text-outline">{l.clienteNome}</p>}
                  </li>
                ))}
              </ul>
              <Link href="/lembretes" className="mt-3 inline-block text-body-sm text-primary hover:underline">
                Ver todos →
              </Link>
            </div>
          )}
        </div>
      </div>

      {andamentoPorColaborador.length > 0 && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h2 className="mb-4 font-display text-title-lg font-semibold text-primary">
            Andamento por Colaborador
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {andamentoPorColaborador.map((c) => (
              <li key={c.colaboradorNome} className="rounded-lg border border-outline-variant p-4">
                <p className="mb-2 font-display text-body-lg font-semibold text-primary">
                  {c.colaboradorNome}
                </p>
                <div className="flex flex-wrap gap-2 text-body-sm">
                  <Badge tone="info" size="sm">{c.aguardando} aguardando</Badge>
                  <Badge tone="warning" size="sm">{c.protocolado} protocolado</Badge>
                  <Badge tone="success" size="sm">{c.finalizados} finalizados</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
        {sazonalidade.length > 0 && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
            <h2 className="mb-4 font-display text-title-lg font-semibold text-primary">
              Vendas por Mês
            </h2>
            <BarChart data={sazonalidade.map((s) => ({ label: s.mes, value: s.n }))} />
          </div>
        )}

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h2 className="mb-4 font-display text-title-lg font-semibold text-primary">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { href: "/clientes/novo", label: "Novo Cliente", icon: UserPlus },
              { href: "/documentos/gerar", label: "Novo Documento", icon: FileText },
              { href: "/agenda/novo", label: "Agendar", icon: CalendarPlus },
              { href: "/area-de-estudos", label: "Escola Náutica", icon: GraduationCap },
              { href: "/processos/novo", label: "Novo Processo", icon: FolderClock },
              { href: "/orcamentos/novo", label: "Novo Orçamento", icon: Receipt },
            ].map((acao) => (
              <Link
                key={acao.href}
                href={acao.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-primary transition-colors hover:bg-surface-container-low"
              >
                <span className="rounded-pill bg-primary-container p-2.5 text-on-primary-container">
                  <acao.icon size={18} />
                </span>
                <span className="text-label-sm">{acao.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
