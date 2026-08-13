import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { CalendarClock, Eye, Pencil, Archive, RotateCcw, CheckCircle2, Plus } from "lucide-react";
import { db } from "@/db";
import { eventos, usuarios } from "@/db/schema";
import { Badge, Button, LinkButton, EmptyState, DataTable, ConfirmButton, BackButton } from "@/components/ui";
import { CampoSelect } from "@/components/ui/form-field";
import { statusEventoInterno } from "@/lib/status";
import { concluirEventoInterno, arquivarEventoInterno, reabrirEventoInterno } from "./actions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ListaEventosInternosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; resp?: string }>;
}) {
  const { status: rawStatus, resp: rawResp } = await searchParams;
  const status =
    rawStatus && (["pendente", "em_andamento", "concluido", "arquivado"] as const).includes(rawStatus as "pendente")
      ? (rawStatus as "pendente" | "em_andamento" | "concluido" | "arquivado")
      : undefined;
  const resp = rawResp && UUID_RE.test(rawResp) ? rawResp : undefined;

  const condicoes = [];
  if (status) condicoes.push(eq(eventos.status, status));
  if (resp) condicoes.push(eq(eventos.responsavelId, resp));

  const linhas = await db
    .select({
      id: eventos.id,
      titulo: eventos.titulo,
      data: eventos.data,
      prazoSolucao: eventos.prazoSolucao,
      status: eventos.status,
      responsavelNome: usuarios.nome,
    })
    .from(eventos)
    .leftJoin(usuarios, eq(eventos.responsavelId, usuarios.id))
    .where(condicoes.length > 0 ? and(...condicoes) : undefined)
    .orderBy(asc(eventos.data));

  const listaUsuarios = await db
    .select({ id: usuarios.id, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(usuarios.nome);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-gutter">
      <BackButton href="/agenda" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Eventos</h1>
        <LinkButton href="/agenda/eventos/novo" size="sm" icon={Plus}>
          + Novo Evento
        </LinkButton>
      </div>

      <form method="get" className="grid grid-cols-1 gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-3">
        <CampoSelect
          label="Status"
          name="status"
          defaultValue={status ?? ""}
          options={[
            { value: "", label: "Todos" },
            { value: "pendente", label: "Pendente" },
            { value: "em_andamento", label: "Em andamento" },
            { value: "concluido", label: "Concluído" },
            { value: "arquivado", label: "Arquivado" },
          ]}
        />
        <CampoSelect
          label="Responsável"
          name="resp"
          defaultValue={resp ?? ""}
          options={[{ value: "", label: "Todos" }, ...listaUsuarios.map((u) => ({ value: u.id, label: u.nome }))]}
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
            header: "Evento",
            cell: (ev) => {
              const prazo = ev.prazoSolucao ? new Date(`${ev.prazoSolucao}T00:00:00`) : null;
              const atrasado =
                prazo && ev.status !== "concluido" && ev.status !== "arquivado" && prazo < hoje;
              return (
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-primary">{ev.titulo}</span>
                  {atrasado && <Badge tone="danger" size="sm">Prazo vencido</Badge>}
                </div>
              );
            },
          },
          {
            header: "Data",
            cell: (ev) =>
              ev.data ? new Date(`${ev.data}T00:00:00`).toLocaleDateString("pt-BR", { dateStyle: "short" }) : "—",
          },
          {
            header: "Prazo",
            cell: (ev) =>
              ev.prazoSolucao
                ? new Date(`${ev.prazoSolucao}T00:00:00`).toLocaleDateString("pt-BR", { dateStyle: "short" })
                : "—",
          },
          {
            header: "Responsável",
            cell: (ev) => ev.responsavelNome ?? "—",
          },
          {
            header: "Status",
            cell: (ev) => (
              <Badge tone={statusEventoInterno(ev.status).tone} icon={statusEventoInterno(ev.status).icon} size="sm">
                {statusEventoInterno(ev.status).label}
              </Badge>
            ),
          },
          {
            header: "Ações",
            cell: (ev) => (
              <div className="flex shrink-0 flex-wrap gap-2">
                <LinkButton href={`/agenda/eventos/${ev.id}`} variant="text" size="sm" icon={Eye}>
                  Ver
                </LinkButton>
                {ev.status !== "arquivado" && (
                  <LinkButton href={`/agenda/eventos/${ev.id}/editar`} variant="text" size="sm" icon={Pencil}>
                    Editar
                  </LinkButton>
                )}
                {ev.status !== "concluido" && ev.status !== "arquivado" && (
                  <form action={concluirEventoInterno.bind(null, ev.id)}>
                    <Button type="submit" variant="outlined" size="sm" icon={CheckCircle2}>
                      Concluir
                    </Button>
                  </form>
                )}
                {ev.status !== "arquivado" ? (
                  <form action={arquivarEventoInterno.bind(null, ev.id)}>
                    <ConfirmButton
                      mensagem={`Arquivar o evento "${ev.titulo}"?`}
                      variant="text"
                      icon={<Archive size={12} />}
                    >
                      Arquivar
                    </ConfirmButton>
                  </form>
                ) : (
                  <form action={reabrirEventoInterno.bind(null, ev.id)}>
                    <Button type="submit" variant="outlined" size="sm" icon={RotateCcw}>
                      Reabrir
                    </Button>
                  </form>
                )}
              </div>
            ),
          },
        ]}
        rows={linhas}
        rowKey={(ev) => ev.id}
        empty={<EmptyState icon={CalendarClock} title="Nenhum evento encontrado" />}
      />
    </div>
  );
}
