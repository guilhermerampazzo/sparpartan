import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, RotateCcw, Archive, CheckCircle2, CalendarClock } from "lucide-react";
import { Badge, Button, LinkButton, ConfirmButton, BackButton, EmptyState } from "@/components/ui";
import { statusEventoInterno } from "@/lib/status";
import { buscarEventoCompleto } from "@/lib/agenda-eventos";
import { concluirEventoInterno, arquivarEventoInterno, reabrirEventoInterno } from "../actions";

const URL_POR_ENTIDADE: Record<string, (id: string) => string> = {
  cliente: (id) => `/clientes/${id}`,
  processo: (id) => `/processos/${id}`,
  embarcacao: (id) => `/embarcacoes/${id}`,
  orcamento: (id) => `/orcamentos/${id}`,
  documento: (id) => `/documentos/${id}`,
  servico: (id) => `/servicos/${id}`,
  obra: (id) => `/obras/${id}`,
  taxa: (id) => `/taxas`,
  aluno: (id) => `/alunos/${id}`,
};

export default async function DetalheEventoInternoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const evento = await buscarEventoCompleto(id);
  if (!evento) notFound();

  const status = statusEventoInterno(evento.status);
  const data = evento.data ? new Date(`${evento.data}T00:00:00`) : null;
  const prazo = evento.prazoSolucao ? new Date(`${evento.prazoSolucao}T00:00:00`) : null;
  const emAtraso = prazo && evento.status !== "concluido" && evento.status !== "arquivado" && prazo < new Date(new Date().toDateString());

  return (
    <div className="space-y-gutter">
      <BackButton href="/agenda/eventos" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-headline-lg font-bold text-primary">{evento.titulo}</h1>
            <Badge tone={status.tone} icon={status.icon} size="sm">{status.label}</Badge>
            {emAtraso && <Badge tone="danger" size="sm">Prazo vencido</Badge>}
          </div>
          <p className="mt-1 text-body-sm text-outline">
            {data?.toLocaleDateString("pt-BR", { dateStyle: "long" })}
            {prazo && ` — Prazo: ${prazo.toLocaleDateString("pt-BR", { dateStyle: "long" })}`}
            {evento.responsavelNome && ` — Responsável: ${evento.responsavelNome}`}
          </p>
        </div>
        <div className="print-hide flex flex-wrap gap-2">
          {evento.status !== "arquivado" && (
            <LinkButton href={`/agenda/eventos/${id}/editar`} variant="outlined" size="sm" icon={Pencil}>
              Editar
            </LinkButton>
          )}
          {evento.status !== "concluido" && evento.status !== "arquivado" && (
            <form action={concluirEventoInterno.bind(null, id)}>
              <Button type="submit" size="sm" icon={CheckCircle2}>Concluir</Button>
            </form>
          )}
          {evento.status !== "arquivado" && (
            <form action={arquivarEventoInterno.bind(null, id)}>
              <ConfirmButton
                mensagem={`Arquivar o evento "${evento.titulo}"? Ele sai da lista ativa, mas continua no histórico.`}
                variant="outlined"
                icon={<Archive size={14} />}
              >
                Arquivar
              </ConfirmButton>
            </form>
          )}
          {evento.status === "arquivado" && (
            <form action={reabrirEventoInterno.bind(null, id)}>
              <Button type="submit" variant="outlined" size="sm" icon={RotateCcw}>
                Reabrir
              </Button>
            </form>
          )}
        </div>
      </div>

      {evento.descricao && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="mb-2 font-display text-title-md font-semibold text-primary">Descrição</h2>
          <p className="whitespace-pre-wrap text-body-md text-primary">{evento.descricao}</p>
        </div>
      )}

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
        <h2 className="mb-3 font-display text-title-md font-semibold text-primary">
          Vinculado a ({evento.vinculos.length})
        </h2>
        {evento.vinculos.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhum vínculo" />
        ) : (
          <ul className="space-y-2">
            {evento.vinculos.map((v) => {
              const url = URL_POR_ENTIDADE[v.entidade]?.(v.entidadeId);
              return (
                <li key={v.id}>
                  {url ? (
                    <Link href={url} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-body-sm text-primary hover:bg-surface-container-low">
                      <Badge tone="neutral" size="sm">{v.entidade}</Badge> {v.rotulo}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-body-sm text-primary">
                      <Badge tone="neutral" size="sm">{v.entidade}</Badge> {v.rotulo}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {evento.observacoes && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="mb-2 font-display text-title-md font-semibold text-primary">Observação</h2>
          <p className="whitespace-pre-wrap text-body-md text-primary">{evento.observacoes}</p>
        </div>
      )}

      <p className="text-body-sm text-outline">
        Criado em {evento.criadoEm.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
        {evento.concluidoEm && ` · Concluído em ${evento.concluidoEm.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}`}
        {evento.arquivadoEm && ` · Arquivado em ${evento.arquivadoEm.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}`}
      </p>
    </div>
  );
}
