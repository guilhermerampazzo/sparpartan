import { desc, eq, sql } from "drizzle-orm";
import { Landmark, Download } from "lucide-react";
import { db } from "@/db";
import { taxasPagar, clientes, processos, servicos } from "@/db/schema";
import { StatCard, Button, LinkButton, EmptyState, DataTable, type Column } from "@/components/ui";
import { marcarTaxaComoPaga } from "./actions";

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
    { header: "Número", cell: (t) => t.numero ?? "—" },
    { header: "Cliente/Serviço", cell: (t) => [t.clienteNome, t.servicoNome].filter(Boolean).join(" — ") || "—" },
    { header: "Valor", cell: (t) => formatMoney(Number(t.valor)) },
    { header: "Vencimento", cell: (t) => t.vencimento ?? "—" },
    {
      header: "Boleto",
      cell: (t) =>
        t.arquivoCaminho ? (
          <a
            href={`/api/taxas/${t.id}`}
            className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
          >
            <Download size={12} /> PDF
          </a>
        ) : (
          "—"
        ),
    },
    {
      header: "",
      align: "right",
      cell: (t) =>
        t.status === "pendente" ? (
          <form action={marcarTaxaComoPaga.bind(null, t.id)} className="flex items-center justify-end gap-2">
            <input type="hidden" name="formaPagamento" value="" />
            <Button type="submit" variant="outlined" size="sm">
              Marcar como Paga
            </Button>
          </form>
        ) : (
          <span className="text-body-sm text-success">Paga</span>
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
