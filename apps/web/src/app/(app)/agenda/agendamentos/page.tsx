import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { CalendarClock, Eye, Pencil, Trash2, FileDown, ExternalLink, Plus } from "lucide-react";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { Badge, LinkButton, Button, EmptyState, DataTable, ConfirmButton, BackButton } from "@/components/ui";
import { CampoSelect } from "@/components/ui/form-field";
import { tipoEvento, statusEvento } from "@/lib/status";
import { listarAgendamentos } from "@/lib/agenda";
import { confirmarAgendamento, concluirAgendamento, excluirAgendamento } from "./actions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ListaAgendamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; status?: string }>;
}) {
  const { clienteId: rawCliente, status: rawStatus } = await searchParams;
  const clienteId = rawCliente && UUID_RE.test(rawCliente) ? rawCliente : undefined;
  const status = rawStatus && ["pendente", "confirmado", "concluido", "cancelado"].includes(rawStatus) ? rawStatus : undefined;

  const todos = await listarAgendamentos();
  const eventos = todos.filter((ev) => {
    if (clienteId && ev.clienteId !== clienteId) return false;
    if (status && ev.status !== status) return false;
    return true;
  });

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .where(isNull(clientes.excluidoEm))
    .orderBy(clientes.nome);

  return (
    <div className="space-y-gutter">
      <BackButton href="/agenda" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Agendamentos</h1>
        <div className="flex gap-2">
          <LinkButton href="/api/agenda/agendamentos/pdf" variant="outlined" size="sm" icon={FileDown}>
            Baixar PDF
          </LinkButton>
          <LinkButton href="/agenda/agendamentos/novo" size="sm" icon={Plus}>
            + Novo Agendamento
          </LinkButton>
        </div>
      </div>

      <form method="get" className="grid grid-cols-1 gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-3">
        <CampoSelect
          label="Filtrar por Cliente"
          name="clienteId"
          defaultValue={clienteId ?? ""}
          options={[{ value: "", label: "Todos" }, ...listaClientes.map((c) => ({ value: c.id, label: c.nome }))]}
        />
        <CampoSelect
          label="Status"
          name="status"
          defaultValue={status ?? ""}
          options={[
            { value: "", label: "Todos" },
            { value: "pendente", label: "Pendente" },
            { value: "confirmado", label: "Confirmado" },
            { value: "concluido", label: "Concluído" },
            { value: "cancelado", label: "Cancelado" },
          ]}
        />
        <div className="flex items-end">
          <Button type="submit" variant="outlined">
            Filtrar
          </Button>
        </div>
      </form>

      <DataTable
        columns={[
          {
            header: "Representante",
            cell: (ev) => ev.representanteNome || "—",
          },
          {
            header: "Data/Hora",
            cell: (ev) =>
              new Date(ev.dataHora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
          },
          {
            header: "Clientes e Serviço",
            cell: (ev) => {
              const nomes = [ev.clienteNome, ...ev.interessados.map((i) => i.nome)].filter(Boolean) as string[];
              const servicos = [ev.servicoNome, ...ev.interessados.map((i) => i.servico).filter(Boolean)].filter(Boolean) as string[];
              return (
                <div className="flex flex-col gap-1">
                  {nomes.length > 0 && <span className="font-medium text-primary">{nomes.join(", ")}</span>}
                  {servicos.length > 0 && <span className="text-body-sm text-outline">{servicos.join(", ")}</span>}
                </div>
              );
            },
          },
          {
            header: "Processos",
            cell: (ev) =>
              ev.processos.length === 0 ? (
                "—"
              ) : (
                <div className="flex flex-wrap gap-1">
                  {ev.processos.map((p) => (
                    <Link key={p.processoId} href={`/processos/${p.processoId}`} className="inline-flex items-center gap-1 rounded-md border border-outline-variant px-1.5 py-0.5 text-body-sm text-primary hover:bg-surface-container-low">
                      {p.servicoNome ?? "Processo"} <ExternalLink size={10} />
                    </Link>
                  ))}
                </div>
              ),
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
            cell: (ev) => (
              <div className="flex shrink-0 flex-wrap gap-2">
                <LinkButton href={`/agenda/agendamentos/${ev.id}`} variant="text" size="sm" icon={Eye}>
                  Ver
                </LinkButton>
                <LinkButton href={`/agenda/agendamentos/${ev.id}/editar`} variant="text" size="sm" icon={Pencil}>
                  Editar
                </LinkButton>
                {ev.status === "pendente" && (
                  <form action={confirmarAgendamento.bind(null, ev.id)}>
                    <Button type="submit" variant="outlined" size="sm">
                      Confirmar
                    </Button>
                  </form>
                )}
                {ev.status !== "concluido" && ev.status !== "cancelado" && (
                  <form action={concluirAgendamento.bind(null, ev.id)}>
                    <Button type="submit" size="sm">
                      Concluir
                    </Button>
                  </form>
                )}
                <LinkButton href={`/api/agenda/agendamentos/${ev.id}/pdf`} variant="text" size="sm" icon={FileDown}>
                  PDF
                </LinkButton>
                <form action={excluirAgendamento.bind(null, ev.id)}>
                  <ConfirmButton
                    mensagem={`Excluir o agendamento de ${ev.clienteNome ?? ""}? Esta ação não pode ser desfeita.`}
                    variant="text"
                    icon={<Trash2 size={12} />}
                  >
                    Excluir
                  </ConfirmButton>
                </form>
              </div>
            ),
          },
        ]}
        rows={eventos}
        rowKey={(ev) => ev.id}
        empty={<EmptyState icon={CalendarClock} title="Nenhum agendamento encontrado" />}
      />
    </div>
  );
}
