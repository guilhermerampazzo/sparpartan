import { desc, eq, sql } from "drizzle-orm";
import { Landmark, Download, Trash2, Eye } from "lucide-react";
import { db } from "@/db";
import { taxasPagar, clientes, processos, servicos } from "@/db/schema";
import { StatCard, Button, LinkButton, Badge, EmptyState, DataTable, ConfirmButton, type Column } from "@/components/ui";
import { marcarTaxaComoPaga, excluirTaxa } from "./actions";

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type LinhaTaxa = {
  id: string;
  descricao: string;
  numero: string | null;
  valor: string;
  vencimento: string | null;
  status: "pendente" | "pago";
  arquivoCaminho: string | null;
  clienteNome: string | null;
  servicoNome: string | null;
};

export default async function TaxasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusValido = status === "pendente" || status === "pago" ? status : undefined;

  const [{ totalPendente }] = await db
    .select({ totalPendente: sql<number>`coalesce(sum(${taxasPagar.valor}), 0)::float` })
    .from(taxasPagar)
    .where(eq(taxasPagar.status, "pendente"));

  const lista = await db
    .select({
      id: taxasPagar.id,
      descricao: taxasPagar.descricao,
      numero: taxasPagar.numero,
      valor: taxasPagar.valor,
      vencimento: taxasPagar.vencimento,
      status: taxasPagar.status,
      arquivoCaminho: taxasPagar.arquivoCaminho,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
    })
    .from(taxasPagar)
    .leftJoin(clientes, eq(taxasPagar.clienteId, clientes.id))
    .leftJoin(processos, eq(taxasPagar.processoId, processos.id))
    .leftJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(statusValido ? eq(taxasPagar.status, statusValido) : undefined)
    .orderBy(desc(taxasPagar.criadoEm));

  const columns: Column<LinhaTaxa>[] = [
    { header: "Descrição", cell: (t) => <span className="font-medium text-primary">{t.descricao}</span> },
    { header: "Nº GRU/Guia", cell: (t) => t.numero ?? "—" },
    { header: "Cliente/Serviço", cell: (t) => [t.clienteNome, t.servicoNome].filter(Boolean).join(" — ") || "—" },
    { header: "Valor", cell: (t) => formatMoney(Number(t.valor)) },
    { header: "Vencimento", cell: (t) => t.vencimento ?? "—" },
    {
      header: "Status",
      cell: (t) =>
        t.status === "pago" ? (
          <Badge tone="success" size="sm">Paga</Badge>
        ) : (
          <Badge tone="warning" size="sm">Pendente</Badge>
        ),
    },
    {
      header: "Boleto",
      cell: (t) =>
        t.arquivoCaminho ? (
          <div className="flex items-center gap-3">
            <a
              href={`/api/taxas/${t.id}?inline=1`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
            >
              <Eye size={12} /> Abrir
            </a>
            <a
              href={`/api/taxas/${t.id}`}
              className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
            >
              <Download size={12} /> Baixar
            </a>
          </div>
        ) : (
          "—"
        ),
    },
    {
      header: "",
      align: "right",
      cell: (t) => (
        <div className="flex items-center justify-end gap-2">
          {t.status === "pendente" ? (
            <form action={marcarTaxaComoPaga.bind(null, t.id)}>
              <input type="hidden" name="formaPagamento" value="" />
              <Button type="submit" variant="outlined" size="sm">
                Marcar Paga
              </Button>
            </form>
          ) : (
            <span className="text-body-sm text-success">Paga</span>
          )}
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
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Taxas</h1>
        <LinkButton href="/taxas/novo">+ Nova Taxa</LinkButton>
      </div>

      <StatCard label="Total pendente" value={formatMoney(totalPendente)} icon={Landmark} tone="warning" />

      <div className="flex gap-2">
        <LinkButton href="/taxas" variant={!statusValido ? "filled" : "outlined"} size="sm">
          Todas
        </LinkButton>
        <LinkButton href="/taxas?status=pendente" variant={statusValido === "pendente" ? "filled" : "outlined"} size="sm">
          Pendentes
        </LinkButton>
        <LinkButton href="/taxas?status=pago" variant={statusValido === "pago" ? "filled" : "outlined"} size="sm">
          Pagas
        </LinkButton>
      </div>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(t) => t.id}
        empty={
          <EmptyState
            icon={Landmark}
            title="Nenhuma taxa registrada ainda"
            action={{ label: "+ Nova Taxa", href: "/taxas/novo" }}
          />
        }
      />
    </div>
  );
}
