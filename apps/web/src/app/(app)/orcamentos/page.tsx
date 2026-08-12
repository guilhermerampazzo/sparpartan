import { desc, eq, isNull, and } from "drizzle-orm";
import { Receipt, Trash2, Landmark } from "lucide-react";
import { db } from "@/db";
import { orcamentos, clientes, servicos } from "@/db/schema";
import { StatusBadge, Button, LinkButton, ConfirmButton, EmptyState, DataTable, type Column, BackButton } from "@/components/ui";
import { statusOrcamento } from "@/lib/status";
import { excluirOrcamento, aprovarOrcamento, recusarOrcamento } from "./actions";

function formatMoney(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type LinhaOrcamento = {
  id: string;
  numero: string;
  valor: string;
  status: string;
  clienteNome: string;
  servicoNome: string | null;
  descricao: string | null;
  criadoEm: Date;
  validoAte: string | null;
};

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const STATUS_VALIDOS = new Set(["pendente", "aprovado", "recusado", "expirado"]);
  const statusFiltro = status && STATUS_VALIDOS.has(status) ? status : undefined;

  const lista = await db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      valor: orcamentos.valor,
      status: orcamentos.status,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
      descricao: orcamentos.descricao,
      criadoEm: orcamentos.criadoEm,
      validoAte: orcamentos.validoAte,
    })
    .from(orcamentos)
    .innerJoin(clientes, eq(orcamentos.clienteId, clientes.id))
    .leftJoin(servicos, eq(orcamentos.servicoId, servicos.id))
    .where(
      and(
        isNull(orcamentos.excluidoEm),
        statusFiltro ? eq(orcamentos.status, statusFiltro as (typeof orcamentos.status.enumValues)[number]) : undefined
      )
    )
    .orderBy(desc(orcamentos.criadoEm));

  const columns: Column<LinhaOrcamento>[] = [
    { header: "Número", cell: (o) => <span className="font-medium text-primary">{o.numero}</span> },
    { header: "Data", cell: (o) => <span className="whitespace-nowrap">{o.criadoEm.toLocaleDateString("pt-BR")}</span> },
    { header: "Cliente", cell: (o) => o.clienteNome },
    { header: "Serviço", cell: (o) => o.servicoNome ?? o.descricao ?? "—" },
    { header: "Valor", cell: (o) => formatMoney(o.valor) },
    {
      header: "Validade",
      cell: (o) => (
        <span className="whitespace-nowrap">
          {o.validoAte ? new Date(`${o.validoAte}T00:00:00`).toLocaleDateString("pt-BR") : "—"}
        </span>
      ),
    },
    { header: "Status", cell: (o) => <StatusBadge status={statusOrcamento(o.status)} /> },
    {
      header: "",
      align: "right",
      cell: (o) => {
        const excluirComId = excluirOrcamento.bind(null, o.id);
        const aprovarComId = aprovarOrcamento.bind(null, o.id);
        const recusarComId = recusarOrcamento.bind(null, o.id);
        return (
          <div className="flex items-center justify-end gap-2">
            {o.status === "pendente" && (
              <>
                <form action={aprovarComId}>
                  <Button type="submit" variant="tonal" size="sm">
                    Aprovar
                  </Button>
                </form>
                <form action={recusarComId}>
                  <Button type="submit" variant="outlined" size="sm">
                    Recusar
                  </Button>
                </form>
                <LinkButton href={`/orcamentos/${o.id}/editar`} variant="text" size="sm">
                  Editar
                </LinkButton>
              </>
            )}
            <form action={excluirComId}>
              <ConfirmButton
                mensagem={`Excluir orçamento ${o.numero}?`}
                variant="text"
                icon={<Trash2 size={12} />}
              >
                Excluir
              </ConfirmButton>
            </form>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-headline-lg font-bold text-primary">Orçamentos</h1>
          {statusFiltro && (
            <LinkButton href="/orcamentos" variant="outlined" size="sm">
              Filtro: {statusFiltro} (limpar)
            </LinkButton>
          )}
        </div>
        <div className="flex gap-3">
          <LinkButton href="/configuracoes/contas-bancarias" variant="outlined" icon={Landmark}>
            Gerenciar Contas Bancárias
          </LinkButton>
          <LinkButton href="/orcamentos/novo">+ Novo Orçamento</LinkButton>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(o) => o.id}
        rowHref={(o) => `/orcamentos/${o.id}`}
        empty={
          <EmptyState
            icon={Receipt}
            title="Nenhum orçamento criado ainda"
            action={{ label: "+ Novo Orçamento", href: "/orcamentos/novo" }}
          />
        }
      />
    </div>
  );
}
