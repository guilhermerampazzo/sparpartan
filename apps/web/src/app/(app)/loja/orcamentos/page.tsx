import { and, desc, eq, ilike, count } from "drizzle-orm";
import { Receipt } from "lucide-react";
import { db } from "@/db";
import { lojaOrcamentos, clientes } from "@/db/schema";
import { Badge, LinkButton, EmptyState, DataTable, SearchBox, Pagination, paginar, type Column } from "@/components/ui";
import { infoStatusOrcamento, formatarMoeda } from "@/lib/loja";

type LinhaOrcamento = {
  id: string;
  numero: string;
  clienteNome: string;
  valorTotal: string;
  status: string;
};

export default async function OrcamentosLojaPage({
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
    .from(lojaOrcamentos)
    .innerJoin(clientes, eq(lojaOrcamentos.clienteId, clientes.id))
    .where(filtro);
  const { limit, offset, paginaAtual, totalPaginas } = paginar(Number(page) || 1, total);

  const lista = await db
    .select({
      id: lojaOrcamentos.id,
      numero: lojaOrcamentos.numero,
      clienteNome: clientes.nome,
      valorTotal: lojaOrcamentos.valorTotal,
      status: lojaOrcamentos.status,
    })
    .from(lojaOrcamentos)
    .innerJoin(clientes, eq(lojaOrcamentos.clienteId, clientes.id))
    .where(filtro)
    .orderBy(desc(lojaOrcamentos.criadoEm))
    .limit(limit)
    .offset(offset);

  const columns: Column<LinhaOrcamento>[] = [
    { header: "Número", cell: (o) => <span className="font-medium text-primary">{o.numero}</span> },
    { header: "Cliente", cell: (o) => o.clienteNome },
    { header: "Valor", cell: (o) => formatarMoeda(o.valorTotal) },
    {
      header: "Status",
      cell: (o) => {
        const info = infoStatusOrcamento(o.status);
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
        <h1 className="font-display text-headline-lg font-bold text-primary">Orçamentos da Loja</h1>
        <LinkButton href="/loja/orcamentos/novo">+ Novo Orçamento</LinkButton>
      </div>

      <SearchBox placeholder="Buscar por cliente..." valorAtual={q} />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(o) => o.id}
        rowHref={(o) => `/loja/orcamentos/${o.id}`}
        empty={
          <EmptyState
            icon={Receipt}
            title={q ? "Nenhum orçamento encontrado" : "Nenhum orçamento cadastrado ainda"}
            action={q ? undefined : { label: "+ Novo Orçamento", href: "/loja/orcamentos/novo" }}
          />
        }
      />

      <Pagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={total} baseParams={{ q }} />
    </div>
  );
}
