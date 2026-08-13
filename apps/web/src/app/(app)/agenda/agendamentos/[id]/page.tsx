import { notFound } from "next/navigation";
import Link from "next/link";
import { CalendarClock, FileDown, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Badge, Button, LinkButton, ConfirmButton, BackButton, EmptyState } from "@/components/ui";
import { tipoEvento, statusEvento } from "@/lib/status";
import { buscarAgendamentoCompleto } from "@/lib/agenda";
import { confirmarAgendamento, concluirAgendamento, excluirAgendamento } from "../actions";
import { ImprimirButton } from "./imprimir-button";

export default async function DetalheAgendamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agendamento = await buscarAgendamentoCompleto(id);
  if (!agendamento) notFound();

  const dataHora = new Date(agendamento.dataHora);
  const tipo = tipoEvento(agendamento.tipo);
  const status = statusEvento(agendamento.status);

  return (
    <div className="space-y-gutter">
      <BackButton href="/agenda/agendamentos" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-headline-lg font-bold text-primary">{agendamento.titulo}</h1>
            <Badge tone={tipo.tone} icon={tipo.icon} size="sm">{tipo.label}</Badge>
            <Badge tone={status.tone} icon={status.icon} size="sm">{status.label}</Badge>
          </div>
          <p className="mt-1 text-body-sm text-outline">
            {dataHora.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
            {agendamento.local && ` — ${agendamento.local}`}
          </p>
        </div>
        <div className="print-hide flex flex-wrap gap-2">
          <LinkButton href={`/agenda/agendamentos/${id}/editar`} variant="outlined" size="sm" icon={Pencil}>
            Editar
          </LinkButton>
          <ImprimirButton />
          <LinkButton href={`/api/agenda/agendamentos/${id}/pdf`} variant="outlined" size="sm" icon={FileDown}>
            Baixar PDF
          </LinkButton>
          {agendamento.status === "pendente" && (
            <form action={confirmarAgendamento.bind(null, id)}>
              <Button type="submit" variant="outlined" size="sm">
                Confirmar
              </Button>
            </form>
          )}
          {agendamento.status !== "concluido" && agendamento.status !== "cancelado" && (
            <form action={concluirAgendamento.bind(null, id)}>
              <Button type="submit" size="sm">Concluir</Button>
            </form>
          )}
          <form action={excluirAgendamento.bind(null, id)}>
            <ConfirmButton
              mensagem={`Excluir o agendamento "${agendamento.titulo}"? Esta ação não pode ser desfeita.`}
              variant="text"
              icon={<Trash2 size={14} />}
            >
              Excluir
            </ConfirmButton>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="mb-3 font-display text-title-md font-semibold text-primary">Dados do Atendimento</h2>
          <dl className="space-y-3 text-body-md">
            <div>
              <dt className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Cliente</dt>
              <dd className="text-primary">
                {agendamento.cliente ? (
                  <Link href={`/clientes/${agendamento.cliente.id}`} className="hover:underline">
                    {agendamento.cliente.nome}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Serviço</dt>
              <dd className="text-primary">{agendamento.servico?.nome ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Representante Legal</dt>
              <dd className="text-primary">
                {agendamento.representanteLegal
                  ? `${agendamento.representanteLegal.nome}${agendamento.representanteLegal.cpf ? ` — CPF ${agendamento.representanteLegal.cpf}` : ""}`
                  : "—"}
              </dd>
            </div>
            {agendamento.observacoes && (
              <div>
                <dt className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Observações</dt>
                <dd className="whitespace-pre-wrap text-primary">{agendamento.observacoes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="mb-3 font-display text-title-md font-semibold text-primary">Processos no mesmo horário</h2>
          {agendamento.processos.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nenhum processo vinculado" />
          ) : (
            <ul className="space-y-2">
              {agendamento.processos.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/processos/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-outline-variant px-3 py-2 text-body-sm text-primary hover:bg-surface-container-low"
                  >
                    <span className="truncate">{p.servicoNome ?? "Processo"}{p.numeroProtocolo ? ` (${p.numeroProtocolo})` : ""}</span>
                    <ExternalLink size={14} className="shrink-0 text-outline" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <h2 className="mb-3 font-display text-title-md font-semibold text-primary">
          Interessados ({agendamento.interessados.length})
        </h2>
        {agendamento.interessados.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhum interessado" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {agendamento.interessados.map((it) => (
              <li key={it.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-primary">{it.nome}</p>
                  {it.cpf && <Badge tone="neutral" size="sm">CPF {it.cpf}</Badge>}
                  {it.servicoSolicitado && <Badge tone="info" size="sm">{it.servicoSolicitado}</Badge>}
                </div>
                {it.observacao && <p className="mt-1 text-body-sm text-outline">{it.observacao}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
