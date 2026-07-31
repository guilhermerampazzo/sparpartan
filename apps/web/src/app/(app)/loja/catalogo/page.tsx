import { and, desc, eq, ilike, count } from "drizzle-orm";
import { Package } from "lucide-react";
import { db } from "@/db";
import { lojaProdutos } from "@/db/schema";
import {
  Badge,
  LinkButton,
  EmptyState,
  DataTable,
  SearchBox,
  Pagination,
  paginar,
  type Column,
} from "@/components/ui";
import { LOJA_CATEGORIAS, rotuloCategoria, formatarMoeda } from "@/lib/loja";

type LinhaProduto = {
  id: string;
  nome: string;
  categoria: string;
  fabricante: string | null;
  preco: string | null;
  estoque: number;
};

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; categoria?: string }>;
}) {
  const { q, page, categoria } = await searchParams;

  const condicoes = [eq(lojaProdutos.ativo, true)];
  if (q) condicoes.push(ilike(lojaProdutos.nome, `%${q}%`));
  if (categoria) {
    condicoes.push(eq(lojaProdutos.categoria, categoria as (typeof LOJA_CATEGORIAS)[number]["value"]));
  }
  const filtro = and(...condicoes);

  const [{ total }] = await db.select({ total: count() }).from(lojaProdutos).where(filtro);
  const { limit, offset, paginaAtual, totalPaginas } = paginar(Number(page) || 1, total);

  const lista = await db
    .select({
      id: lojaProdutos.id,
      nome: lojaProdutos.nome,
      categoria: lojaProdutos.categoria,
      fabricante: lojaProdutos.fabricante,
      preco: lojaProdutos.preco,
      estoque: lojaProdutos.estoque,
    })
    .from(lojaProdutos)
    .where(filtro)
    .orderBy(desc(lojaProdutos.criadoEm))
    .limit(limit)
    .offset(offset);

  const columns: Column<LinhaProduto>[] = [
    { header: "Produto", cell: (p) => <span className="font-medium text-primary">{p.nome}</span> },
    { header: "Categoria", cell: (p) => <Badge tone="info" size="sm">{rotuloCategoria(p.categoria)}</Badge> },
    { header: "Fabricante", cell: (p) => p.fabricante ?? "—" },
    { header: "Preço", cell: (p) => formatarMoeda(p.preco) },
    {
      header: "Estoque",
      align: "right",
      cell: (p) => (
        <Badge tone={p.estoque > 0 ? "success" : "danger"} size="sm">
          {p.estoque}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Catálogo</h1>
        <LinkButton href="/loja/catalogo/novo">+ Novo Produto</LinkButton>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LinkButton href="/loja/catalogo" variant={!categoria ? "filled" : "outlined"} size="sm">
          Todas
        </LinkButton>
        {LOJA_CATEGORIAS.map((c) => (
          <LinkButton
            key={c.value}
            href={`/loja/catalogo?categoria=${c.value}`}
            variant={categoria === c.value ? "filled" : "outlined"}
            size="sm"
          >
            {c.label}
          </LinkButton>
        ))}
      </div>

      <SearchBox placeholder="Buscar por nome do produto..." valorAtual={q} />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(p) => p.id}
        rowHref={(p) => `/loja/catalogo/${p.id}`}
        empty={
          <EmptyState
            icon={Package}
            title={q ? "Nenhum produto encontrado" : "Nenhum produto cadastrado ainda"}
            action={q ? undefined : { label: "+ Novo Produto", href: "/loja/catalogo/novo" }}
          />
        }
      />

      <Pagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={total} baseParams={{ q }} />
    </div>
  );
}
