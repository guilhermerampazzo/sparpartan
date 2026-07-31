import { and, desc, eq, ilike, count } from "drizzle-orm";
import { ShoppingBag } from "lucide-react";
import { db } from "@/db";
import { lojaVendas, clientes } from "@/db/schema";
import { Badge, LinkButton, EmptyState, DataTable, SearchBox, Pagination, paginar, type Column } from "@/components/ui";
import { infoStatusVenda, formatarMoeda } from "@/lib/loja";

type LinhaVenda = {
  id: string;
  clienteNome: string;
  valorTotal: string;
  status: string;
  criadoEm: Date;
};

export default async function VendasLojaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;

  const condicoes = [];
  if (q) condicoes.push(ilike(clientes.nome, `%${q}%`));
  const filtro = condicoes.length ? and(...condicoes) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(lojaVendas)
    .innerJoin(clientes, eq(lojaVendas.clienteId, clientes.id))
    .where(filtro);
  const { limit, offset, paginaAtual, totalPaginas } = paginar(Number(page) || 1, total);

  const lista = await db
    .select({
      id: lojaVendas.id,
      clienteNome: clientes.nome,
      valorTotal: lojaVendas.valorTotal,
      status: lojaVendas.status,
      criadoEm: lojaVendas.criadoEm,
    })
    .from(lojaVendas)
    .innerJoin(clientes, eq(lojaVendas.clienteId, clientes.id))
    .where(filtro)
    .orderBy(desc(lojaVendas.criadoEm))
    .limit(limit)
    .offset(offset);

  const columns: Column<LinhaVenda>[] = [
    { header: "Cliente", cell: (v) => <span className="font-medium text-primary">{v.clienteNome}</span> },
    { header: "Valor", cell: (v) => formatarMoeda(v.valorTotal) },
    { header: "Data", cell: (v) => new Date(v.criadoEm).toLocaleDateString("pt-BR") },
    {
      header: "Status",
      cell: (v) => {
        const info = infoStatusVenda(v.status);
        return (
          <Badge tone={info.tone} size="sm">
            {info.label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Vendas da Loja</h1>
        <LinkButton href="/loja/orcamentos/novo">+ Novo Orçamento</LinkButton>
      </div>

      <SearchBox placeholder="Buscar por cliente..." valorAtual={q} />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(v) => v.id}
        rowHref={(v) => `/loja/vendas/${v.id}`}
        empty={
          <EmptyState
            icon={ShoppingBag}
            title="Nenhuma venda registrada ainda"
            description="Vendas são criadas automaticamente ao aprovar um orçamento."
          />
        }
      />

      <Pagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={total} baseParams={{ q }} />
    </div>
  );
}
