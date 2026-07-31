import { and, desc, eq, isNull, or, ilike, count } from "drizzle-orm";
import { Ship, Trash2 } from "lucide-react";
import { db } from "@/db";
import { embarcacoes, clientes } from "@/db/schema";
import {
  Badge,
  StatusBadge,
  LinkButton,
  EmptyState,
  DataTable,
  SearchBox,
  Pagination,
  ConfirmButton,
  paginar,
  type Column,
} from "@/components/ui";
import { urgenciaVencimento, infoUrgencia } from "@/lib/status";
import { excluirEmbarcacao } from "./actions";

type LinhaEmbarcacao = {
  id: string;
  nome: string;
  tipo: string | null;
  numeroInscricao: string | null;
  clienteNome: string;
  validadeDpem: string | null;
  classe: "esporte_recreio" | "comercial";
};

export default async function EmbarcacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; classe?: string }>;
}) {
  const { q, page, classe } = await searchParams;

  const condicoes = [isNull(embarcacoes.excluidoEm)];
  if (q) {
    condicoes.push(
      or(
        ilike(embarcacoes.nome, `%${q}%`),
        ilike(clientes.nome, `%${q}%`),
        ilike(embarcacoes.numeroInscricao, `%${q}%`)
      )!
    );
  }
  if (classe === "esporte_recreio" || classe === "comercial") {
    condicoes.push(eq(embarcacoes.classe, classe));
  }
  const filtro = and(...condicoes);

  const [{ total }] = await db
    .select({ total: count() })
    .from(embarcacoes)
    .innerJoin(clientes, eq(embarcacoes.clienteId, clientes.id))
    .where(filtro);

  const { limit, offset, paginaAtual, totalPaginas } = paginar(Number(page) || 1, total);

  const lista = await db
    .select({
      id: embarcacoes.id,
      nome: embarcacoes.nome,
      tipo: embarcacoes.tipo,
      numeroInscricao: embarcacoes.numeroInscricao,
      clienteNome: clientes.nome,
      validadeDpem: embarcacoes.validadeDpem,
      classe: embarcacoes.classe,
    })
    .from(embarcacoes)
    .innerJoin(clientes, eq(embarcacoes.clienteId, clientes.id))
    .where(filtro)
    .orderBy(desc(embarcacoes.criadoEm))
    .limit(limit)
    .offset(offset);

  const columns: Column<LinhaEmbarcacao>[] = [
    { header: "Nome", cell: (e) => <span className="font-medium text-primary">{e.nome}</span> },
    { header: "Proprietário", cell: (e) => e.clienteNome },
    { header: "Tipo", cell: (e) => e.tipo ?? "—" },
    {
      header: "Classe",
      cell: (e) => (
        <Badge tone={e.classe === "comercial" ? "warning" : "info"} size="sm">
          {e.classe === "comercial" ? "Comercial" : "Esporte e Recreio"}
        </Badge>
      ),
    },
    { header: "Inscrição", cell: (e) => e.numeroInscricao ?? "—" },
    {
      header: "DPEM",
      cell: (e) =>
        e.validadeDpem ? (
          <StatusBadge status={infoUrgencia(urgenciaVencimento(e.validadeDpem))} size="sm" />
        ) : (
          "—"
        ),
    },
    {
      header: "",
      align: "right",
      cell: (e) => {
        const excluirComId = excluirEmbarcacao.bind(null, e.id);
        return (
          <form action={excluirComId}>
            <ConfirmButton
              mensagem={`Excluir a embarcação ${e.nome}?`}
              variant="text"
              icon={<Trash2 size={12} />}
            >
              Excluir
            </ConfirmButton>
          </form>
        );
      },
    },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Embarcações</h1>
        <div className="flex gap-2">
          <LinkButton href="/embarcacoes/novo?classe=esporte_recreio" variant="outlined">
            + Esporte e Recreio
          </LinkButton>
          <LinkButton href="/embarcacoes/novo?classe=comercial">+ Comercial</LinkButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LinkButton href="/embarcacoes" variant={!classe ? "filled" : "outlined"} size="sm">
          Todas
        </LinkButton>
        <LinkButton
          href="/embarcacoes?classe=esporte_recreio"
          variant={classe === "esporte_recreio" ? "filled" : "outlined"}
          size="sm"
        >
          Esporte e Recreio
        </LinkButton>
        <LinkButton
          href="/embarcacoes?classe=comercial"
          variant={classe === "comercial" ? "filled" : "outlined"}
          size="sm"
        >
          Comercial
        </LinkButton>
      </div>

      <SearchBox placeholder="Buscar por nome, proprietário ou inscrição..." valorAtual={q} />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(e) => e.id}
        rowHref={(e) => `/embarcacoes/${e.id}`}
        empty={
          <EmptyState
            icon={Ship}
            title={q ? "Nenhuma embarcação encontrada" : "Nenhuma embarcação cadastrada ainda"}
            action={q ? undefined : { label: "+ Nova Embarcação", href: "/embarcacoes/novo" }}
          />
        }
      />

      <Pagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={total} baseParams={{ q }} />
    </div>
  );
}
