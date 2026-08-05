import { asc, eq, gte, and, inArray, isNotNull } from "drizzle-orm";
import { ChevronLeft, ChevronRight, CalendarClock, Landmark, Eye, Trash2, FileDown, Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { agendaEventos, agendaInteressados, clientes, processos, servicos, taxasPagar } from "@/db/schema";
import { CampoSelect, SectionCard } from "@/components/ui/form-field";
import { Badge, LinkButton, Button, EmptyState, CalendarMonth, ConfirmButton, DataTable } from "@/components/ui";
import { statusEvento, tipoEvento, fonteCalendario, type FonteCalendarioTipo } from "@/lib/status";
import { gradeDoMes, buscarItensCalendario, FONTES_PADRAO, TODAS_FONTES } from "@/lib/calendario";
import { buscarProcessosAgendados } from "@/lib/agenda-processos";
import { confirmarEvento, concluirEvento } from "./actions";
import { marcarTaxaComoPaga, excluirTaxa } from "../taxas/actions";

function formatMoney(v: string | number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MES_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function uuidValido(valor?: string) {
  return valor && UUID_RE.test(valor) ? valor : undefined;
}

function mesValido(valor?: string) {
  return valor && MES_RE.test(valor) ? valor : undefined;
}

function montarUrl(mes: string, fontes: FonteCalendarioTipo[], vista?: string) {
  const params = new URLSearchParams();
  params.set("mes", mes);
  if (fontes.length !== FONTES_PADRAO.length || fontes.some((f) => !FONTES_PADRAO.includes(f))) {
    params.set("fontes", fontes.join(","));
  }
  if (vista) params.set("vista", vista);
  return `?${params.toString()}`;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; processoId?: string; mes?: string; fontes?: string; vista?: string }>;
}) {
  const params = await searchParams;
  const clienteId = uuidValido(params.clienteId);
  const processoId = uuidValido(params.processoId);
  const mes = mesValido(params.mes);
  const { fontes, vista } = params;

  if (vista === "lista") {
    return <VistaLista clienteId={clienteId} processoId={processoId} />;
  }

  const agora = new Date();
  const mesRef = mes ? new Date(`${mes}-01T00:00:00`) : new Date(agora.getFullYear(), agora.getMonth(), 1);
  const mesStr = `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, "0")}`;

  const fontesAtivas = (fontes ? (fontes.split(",") as FonteCalendarioTipo[]) : FONTES_PADRAO).filter((f) =>
    TODAS_FONTES.includes(f)
  );

  const session = await auth();
  const mostrarValores = (session?.user as { role?: string } | undefined)?.role === "admin";

  const { inicio, fim, celulas } = gradeDoMes(mesRef);
  const itens = await buscarItensCalendario(inicio, fim, fontesAtivas, mostrarValores);

  const mesAnterior = new Date(mesRef.getFullYear(), mesRef.getMonth() - 1, 1);
  const mesSeguinte = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 1);
  const mesAnteriorStr = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, "0")}`;
  const mesSeguinteStr = `${mesSeguinte.getFullYear()}-${String(mesSeguinte.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Agenda</h1>
        <div className="flex gap-3">
          <LinkButton href={montarUrl(mesStr, fontesAtivas, "lista")} variant="outlined" size="sm">
            Ver Lista
          </LinkButton>
          <LinkButton href="/agenda/novo">+ Novo Evento</LinkButton>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
        <Link
          href={montarUrl(mesAnteriorStr, fontesAtivas)}
          className="flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm hover:bg-surface-container-low"
        >
          <ChevronLeft size={14} /> Anterior
        </Link>
        <span className="font-display text-title-lg font-semibold text-primary">
          {NOMES_MES[mesRef.getMonth()]} {mesRef.getFullYear()}
        </span>
        <Link
          href={montarUrl(mesSeguinteStr, fontesAtivas)}
          className="flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm hover:bg-surface-container-low"
        >
          Próximo <ChevronRight size={14} />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {TODAS_FONTES.map((tipo) => {
          const ativa = fontesAtivas.includes(tipo);
          const novasFontes = ativa ? fontesAtivas.filter((f) => f !== tipo) : [...fontesAtivas, tipo];
          const info = fonteCalendario(tipo);
          return (
            <Link key={tipo} href={montarUrl(mesStr, novasFontes)}>
              <Badge tone={ativa ? info.tone : "neutral"} icon={info.icon} size="sm">
                {info.label}
              </Badge>
            </Link>
          );
        })}
      </div>

      <CalendarMonth celulas={celulas} itens={itens} />

      <ProcessosAgendados />

      <ListaLevarMarinha />
    </div>
  );
}

async function ProcessosAgendados() {
  const eventos = await buscarProcessosAgendados();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-primary">Processos Agendados</h2>
        <div className="flex gap-2">
          <LinkButton href="/api/agenda/processos-agendados/pdf" variant="outlined" size="sm" icon={FileDown}>
            Baixar PDF
          </LinkButton>
          <LinkButton href="/agenda/novo" size="sm" icon={Plus}>
            + Novo Processo
          </LinkButton>
        </div>
      </div>

      <DataTable
        columns={[
            {
              header: "Representante Legal",
              cell: (ev) => ev.representanteLegal || "—",
            },
            {
              header: "Data/Hora",
              cell: (ev) =>
                new Date(ev.dataHora).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" }),
            },
            {
              header: "Clientes e Serviço",
              cell: (ev) => {
                const clientes = [
                  ev.clienteNome,
                  ...ev.interessados.map((i) => i.nomeInteressado),
                ].filter(Boolean) as string[];
                const servicos = [
                  ev.servicoNome,
                  ...ev.interessados.map((i) => i.servicoSolicitado).filter(Boolean),
                ].filter(Boolean) as string[];
                return (
                  <div className="flex flex-col gap-1">
                    {clientes.length > 0 && (
                      <span className="font-medium text-primary">{clientes.join(", ")}</span>
                    )}
                    {servicos.length > 0 && <span className="text-body-sm text-outline">{servicos.join(", ")}</span>}
                  </div>
                );
              },
            },
            {
              header: "Status",
              cell: (ev) => (
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={tipoEvento(ev.tipo).tone} icon={tipoEvento(ev.tipo).icon} size="sm">
                    {tipoEvento(ev.tipo).label}
                  </Badge>
                  <Badge tone={statusEvento(ev.status).tone} icon={statusEvento(ev.status).icon} size="sm">
                    {statusEvento(ev.status).label}
                  </Badge>
                </div>
              ),
            },
            {
              header: "Ações",
              cell: (ev) => {
                const confirmarComId = confirmarEvento.bind(null, ev.id);
                const concluirComId = concluirEvento.bind(null, ev.id);
                return (
                  <div className="flex shrink-0 gap-2">
                    {ev.processoId && (
                      <LinkButton href={`/processos/${ev.processoId}`} variant="text" size="sm">
                        Ver processo
                      </LinkButton>
                    )}
                    {ev.status === "pendente" && (
                      <form action={confirmarComId}>
                        <Button type="submit" variant="outlined" size="sm">
                          Confirmar
                        </Button>
                      </form>
                    )}
                    {ev.status !== "concluido" && ev.status !== "cancelado" && (
                      <form action={concluirComId}>
                        <Button type="submit" size="sm">
                          Concluir
                        </Button>
                      </form>
                    )}
                  </div>
                );
              },
            },
          ]}
          rows={eventos}
          rowKey={(ev) => ev.id}
          empty={<EmptyState icon={CalendarClock} title="Nenhum processo agendado" />}
        />
    </div>
  );
}

async function ListaLevarMarinha() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const eventosComLocal = await db
    .select({
      id: agendaEventos.id,
      titulo: agendaEventos.titulo,
      dataHora: agendaEventos.dataHora,
      local: agendaEventos.local,
      representanteLegal: agendaEventos.representanteLegal,
      clienteNome: clientes.nome,
    })
    .from(agendaEventos)
    .leftJoin(clientes, eq(agendaEventos.clienteId, clientes.id))
    .where(and(isNotNull(agendaEventos.local), gte(agendaEventos.dataHora, hoje)))
    .orderBy(asc(agendaEventos.dataHora));

  const interessadosPorEvento = new Map<string, { nomeInteressado: string; servicoSolicitado: string | null }[]>();
  if (eventosComLocal.length > 0) {
    const todosInteressados = await db
      .select()
      .from(agendaInteressados)
      .where(inArray(agendaInteressados.eventoId, eventosComLocal.map((ev) => ev.id)));
    for (const it of todosInteressados) {
      const lista = interessadosPorEvento.get(it.eventoId) ?? [];
      lista.push({ nomeInteressado: it.nomeInteressado, servicoSolicitado: it.servicoSolicitado });
      interessadosPorEvento.set(it.eventoId, lista);
    }
  }

  return (
    <SectionCard title="Agendamentos para Levar na Marinha">
      {eventosComLocal.length === 0 ? (
        <EmptyState icon={Landmark} title="Nenhum agendamento com local definido ainda" />
      ) : (
        <ul className="divide-y divide-outline-variant">
          {eventosComLocal.map((ev) => {
            const interessados = interessadosPorEvento.get(ev.id) ?? [];
            return (
              <li key={ev.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-primary">{ev.titulo}</p>
                  <Badge tone="info" size="sm">
                    {new Date(ev.dataHora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </Badge>
                </div>
                <p className="text-body-sm text-outline">
                  Local: {ev.local}
                  {ev.representanteLegal && ` — Representante Legal: ${ev.representanteLegal}`}
                  {ev.clienteNome && ` — ${ev.clienteNome}`}
                </p>
                {interessados.length > 0 && (
                  <ul className="mt-2 ml-4 list-disc text-body-sm text-primary">
                    {interessados.map((it, idx) => (
                      <li key={idx}>
                        {it.nomeInteressado}
                        {it.servicoSolicitado && ` — ${it.servicoSolicitado}`}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

async function VistaLista({ clienteId, processoId }: { clienteId?: string; processoId?: string }) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const condicoes = [gte(agendaEventos.dataHora, hoje)];
  if (clienteId) condicoes.push(eq(agendaEventos.clienteId, clienteId));
  if (processoId) condicoes.push(eq(agendaEventos.processoId, processoId));

  const eventos = await db
    .select({
      id: agendaEventos.id,
      titulo: agendaEventos.titulo,
      dataHora: agendaEventos.dataHora,
      tipo: agendaEventos.tipo,
      status: agendaEventos.status,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
    })
    .from(agendaEventos)
    .leftJoin(clientes, eq(agendaEventos.clienteId, clientes.id))
    .leftJoin(processos, eq(agendaEventos.processoId, processos.id))
    .leftJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(and(...condicoes))
    .orderBy(asc(agendaEventos.dataHora));

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  const listaProcessos = clienteId
    ? await db
        .select({ id: processos.id, servicoNome: servicos.nome })
        .from(processos)
        .innerJoin(servicos, eq(processos.servicoId, servicos.id))
        .where(eq(processos.clienteId, clienteId))
    : [];

  const condicoesTaxas = [eq(taxasPagar.status, "pendente")];
  if (clienteId) condicoesTaxas.push(eq(taxasPagar.clienteId, clienteId));

  const taxasPendentes = await db
    .select({
      id: taxasPagar.id,
      numero: taxasPagar.numero,
      descricao: taxasPagar.descricao,
      valor: taxasPagar.valor,
      vencimento: taxasPagar.vencimento,
      arquivoCaminho: taxasPagar.arquivoCaminho,
      clienteNome: clientes.nome,
    })
    .from(taxasPagar)
    .leftJoin(clientes, eq(taxasPagar.clienteId, clientes.id))
    .where(and(...condicoesTaxas))
    .orderBy(asc(taxasPagar.vencimento));

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Agenda</h1>
        <div className="flex gap-3">
          <LinkButton href="/agenda" variant="outlined" size="sm">
            Ver Calendário
          </LinkButton>
          <LinkButton href="/agenda/novo">+ Novo Evento</LinkButton>
        </div>
      </div>

      <form
        method="get"
        className="grid grid-cols-1 gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-3"
      >
        <input type="hidden" name="vista" value="lista" />
        <CampoSelect
          label="Filtrar por Cliente"
          name="clienteId"
          defaultValue={clienteId ?? ""}
          options={[
            { value: "", label: "Todos" },
            ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
          ]}
        />
        <CampoSelect
          label="Filtrar por Processo"
          name="processoId"
          defaultValue={processoId ?? ""}
          options={[
            { value: "", label: clienteId ? "Todos deste cliente" : "Selecione um cliente primeiro" },
            ...listaProcessos.map((p) => ({ value: p.id, label: p.servicoNome })),
          ]}
        />
        <div className="flex items-end">
          <Button type="submit" variant="outlined">
            Filtrar
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {eventos.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhum evento futuro agendado" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {eventos.map((evento) => {
              const confirmarComId = confirmarEvento.bind(null, evento.id);
              const concluirComId = concluirEvento.bind(null, evento.id);
              return (
                <li key={evento.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-md font-medium text-primary">{evento.titulo}</p>
                      <Badge tone={tipoEvento(evento.tipo).tone} icon={tipoEvento(evento.tipo).icon} size="sm">
                        {tipoEvento(evento.tipo).label}
                      </Badge>
                      <Badge tone={statusEvento(evento.status).tone} icon={statusEvento(evento.status).icon} size="sm">
                        {statusEvento(evento.status).label}
                      </Badge>
                    </div>
                    <p className="text-body-sm text-outline">
                      {new Date(evento.dataHora).toLocaleString("pt-BR")}
                      {evento.clienteNome && ` — ${evento.clienteNome}`}
                      {evento.servicoNome && ` (${evento.servicoNome})`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {evento.status === "pendente" && (
                      <form action={confirmarComId}>
                        <Button type="submit" variant="outlined" size="sm">
                          Confirmar
                        </Button>
                      </form>
                    )}
                    {evento.status !== "concluido" && (
                      <form action={concluirComId}>
                        <Button type="submit" size="sm">
                          Concluir
                        </Button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SectionCard title="Taxas a pagar">
        {taxasPendentes.length === 0 ? (
          <EmptyState icon={Landmark} title="Nenhuma taxa pendente" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {taxasPendentes.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-primary">
                      {t.clienteNome ?? "Sem cliente"}
                      {t.numero && <span className="font-mono text-body-sm text-outline"> — GRU {t.numero}</span>}
                    </p>
                    <Badge tone="warning" size="sm">Pendente</Badge>
                  </div>
                  <p className="text-body-sm text-outline">
                    {t.descricao} — {formatMoney(t.valor)}
                    {t.vencimento && ` — vence ${new Date(`${t.vencimento}T00:00:00`).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {t.arquivoCaminho && (
                    <a
                      href={`/api/taxas/${t.id}?inline=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
                    >
                      <Eye size={12} /> Abrir boleto
                    </a>
                  )}
                  <form action={marcarTaxaComoPaga.bind(null, t.id)}>
                    <input type="hidden" name="formaPagamento" value="" />
                    <Button type="submit" variant="outlined" size="sm">
                      Marcar Paga
                    </Button>
                  </form>
                  <form action={excluirTaxa.bind(null, t.id)}>
                    <ConfirmButton
                      mensagem={`Excluir a taxa "${t.descricao}"? O arquivo também será removido.`}
                      variant="text"
                      icon={<Trash2 size={12} />}
                    >
                      Excluir
                    </ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
