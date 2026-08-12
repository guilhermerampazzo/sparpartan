import { and, desc, eq, sql, isNull, or, ilike, count } from "drizzle-orm";
import { Users, FolderClock, FileWarning, Trash2 } from "lucide-react";
import { db } from "@/db";
import { clientes, processos, documentosGerados } from "@/db/schema";
import {
  Badge,
  LinkButton,
  Button,
  ConfirmButton,
  EmptyState,
  DataTable,
  SearchBox,
  Pagination,
  paginar,
  type Column,
  BackButton,
} from "@/components/ui";
import { CampoSelect } from "@/components/ui/form-field";
import { excluirCliente, gerarLinkCadastroNovoCliente } from "./actions";

type LinhaCliente = {
  id: string;
  nome: string;
  cpfCnpj: string;
  celular: string | null;
  telefone: string | null;
  cidade: string | null;
  classificacao: string;
  processosAbertos: number;
  documentosVencendo: number;
};

const CLASSIFICACAO_LABEL: Record<string, string> = {
  cliente: "Cliente",
  aluno: "Aluno",
  ambos: "Cliente e Aluno",
};

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string; q?: string; page?: string; tipo?: string }>;
}) {
  const { link, q, page, tipo } = await searchParams;

  const filtro = and(
    isNull(clientes.excluidoEm),
    q ? or(ilike(clientes.nome, `%${q}%`), ilike(clientes.cpfCnpj, `%${q}%`)) : undefined,
    tipo ? eq(clientes.classificacao, tipo as "cliente" | "aluno" | "ambos") : undefined
  );

  const [{ total }] = await db.select({ total: count() }).from(clientes).where(filtro);
  const { limit, offset, paginaAtual, totalPaginas } = paginar(Number(page) || 1, total);

  const lista = await db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      cpfCnpj: clientes.cpfCnpj,
      celular: clientes.celular,
      telefone: clientes.telefone,
      cidade: clientes.cidade,
      classificacao: clientes.classificacao,
      processosAbertos: sql<number>`(
        select count(*)::int from ${processos}
        where ${processos.clienteId} = ${sql.raw('"clientes"."id"')}
          and ${processos.status} not in ('concluido', 'cancelado')
      )`,
      documentosVencendo: sql<number>`(
        select count(*)::int from ${documentosGerados}
        where ${documentosGerados.clienteId} = ${sql.raw('"clientes"."id"')}
          and ${documentosGerados.vencimento} is not null
          and ${documentosGerados.vencimento} <= current_date + 30
      )`,
    })
    .from(clientes)
    .where(filtro)
    .orderBy(desc(clientes.criadoEm))
    .limit(limit)
    .offset(offset);

  const columns: Column<LinhaCliente>[] = [
    { header: "Nome", cell: (c) => <span className="font-medium text-primary">{c.nome}</span> },
    { header: "CPF/CNPJ", cell: (c) => c.cpfCnpj },
    { header: "Telefone", cell: (c) => c.celular ?? c.telefone ?? "—" },
    { header: "Cidade", cell: (c) => c.cidade ?? "—" },
    {
      header: "Tipo",
      cell: (c) => (
        <Badge tone={c.classificacao === "ambos" ? "info" : "neutral"} size="sm">
          {CLASSIFICACAO_LABEL[c.classificacao] ?? c.classificacao}
        </Badge>
      ),
    },
    {
      header: "Status",
      cell: (c) => (
        <div className="flex flex-wrap gap-1.5">
          {c.processosAbertos > 0 && (
            <Badge tone="info" icon={FolderClock} size="sm">
              {c.processosAbertos} em andamento
            </Badge>
          )}
          {c.documentosVencendo > 0 && (
            <Badge tone="warning" icon={FileWarning} size="sm">
              {c.documentosVencendo} vencendo
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: "",
      align: "right",
      cell: (c) => {
        const excluirComId = excluirCliente.bind(null, c.id);
        return (
          <form action={excluirComId}>
            <ConfirmButton
              mensagem={`Excluir ${c.nome}? Vai para a lixeira, dá para restaurar depois.`}
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
      <BackButton href="/" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Clientes</h1>
        <div className="flex gap-3">
          <LinkButton href="/clientes/lixeira" variant="outlined" size="sm">
            Lixeira
          </LinkButton>
          <LinkButton href="/clientes/indicacoes" variant="outlined" size="sm">
            Indicações
          </LinkButton>
          <LinkButton href="/clientes/aniversariantes" variant="outlined" size="sm">
            Aniversariantes
          </LinkButton>
          <LinkButton href="/clientes/novo">+ Novo Cliente</LinkButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBox placeholder="Buscar por nome ou CPF/CNPJ..." valorAtual={q} hiddenParams={{ tipo }} />
          <form method="get" className="flex items-center gap-2">
            {q && <input type="hidden" name="q" value={q} />}
            <div className="w-48">
              <CampoSelect
                label=""
                name="tipo"
                defaultValue={tipo ?? ""}
                options={[
                  { value: "", label: "Todos" },
                  { value: "cliente", label: "Cliente" },
                  { value: "aluno", label: "Aluno" },
                  { value: "ambos", label: "Cliente e Aluno" },
                ]}
              />
            </div>
            <Button type="submit" variant="outlined" size="sm">
              Filtrar
            </Button>
          </form>
        </div>
        <form action={gerarLinkCadastroNovoCliente}>
          <Button type="submit" variant="outlined" size="sm">
            Gerar link para cliente se cadastrar
          </Button>
        </form>
      </div>
      {link && (
        <span className="break-all rounded-lg bg-info-container px-3 py-1.5 text-body-sm text-on-info-container">
          {`${process.env.AUTH_URL || "http://localhost:8080"}/c/${link}`}
        </span>
      )}

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(c) => c.id}
        rowHref={(c) => `/clientes/${c.id}`}
        empty={
          <EmptyState
            icon={Users}
            title={q || tipo ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}
            action={q || tipo ? undefined : { label: "+ Novo Cliente", href: "/clientes/novo" }}
          />
        }
      />

      <Pagination
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        totalRegistros={total}
        baseParams={{ q, tipo }}
      />
    </div>
  );
}
