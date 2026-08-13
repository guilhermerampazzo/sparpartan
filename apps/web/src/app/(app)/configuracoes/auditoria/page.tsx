import { desc, or, ilike, count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ClipboardList, SearchX } from "lucide-react";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { auth } from "@/lib/auth";
import { formatarDataHoraBR } from "@/lib/datas";
import { LinkButton, Badge, EmptyState, DataTable, type Column, BackButton, Pagination, paginar, SearchBox } from "@/components/ui";

type LinhaAuditoria = typeof auditLog.$inferSelect;

const ACAO_TONE: Record<string, "success" | "info" | "danger" | "neutral" | "warning"> = {
  criar: "success",
  atualizar: "info",
  excluir: "danger",
  arquivar: "neutral",
  alterar_status: "info",
  login: "neutral",
  restaurar: "success",
};

const ACAO_LABEL: Record<string, string> = {
  criar: "Criar",
  atualizar: "Atualizar",
  excluir: "Excluir",
  arquivar: "Arquivar",
  alterar_status: "Alterar status",
  login: "Login",
  restaurar: "Restaurar",
};

const ENTIDADES = [
  "cliente",
  "processo",
  "arquivo",
  "documento",
  "taxa_pagar",
  "orcamento",
  "pendencia",
  "agenda_evento",
  "evento",
  "representante_legal",
  "embarcacao",
  "loja_venda",
  "loja_orcamento",
  "empresa",
  "empresa_documento",
  "empresa_manutencao",
];

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; acao?: string; entidade?: string; page?: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") redirect("/configuracoes");

  const { q, acao, entidade, page } = await searchParams;
  const filtro = or(
    q ? ilike(auditLog.usuarioNome, `%${q}%`) : undefined,
    q ? ilike(auditLog.detalhes, `%${q}%`) : undefined,
    q ? ilike(auditLog.entidade, `%${q}%`) : undefined,
    acao && ACAO_LABEL[acao] ? ilike(auditLog.acao, acao) : undefined,
    entidade ? ilike(auditLog.entidade, entidade) : undefined
  );

  const [{ total }] = await db.select({ total: count() }).from(auditLog).where(filtro);
  const { limit, offset, paginaAtual, totalPaginas } = paginar(Number(page) || 1, total);

  const lista = await db
    .select()
    .from(auditLog)
    .where(filtro)
    .orderBy(desc(auditLog.criadoEm))
    .limit(limit)
    .offset(offset);

  const columns: Column<LinhaAuditoria>[] = [
    {
      header: "Quando",
      cell: (l) => (
        <span className="whitespace-nowrap text-body-sm text-primary">{formatarDataHoraBR(l.criadoEm)}</span>
      ),
    },
    { header: "Usuário", cell: (l) => <span className="font-medium text-primary">{l.usuarioNome ?? "—"}</span> },
    {
      header: "Ação",
      cell: (l) => (
        <Badge tone={ACAO_TONE[l.acao] ?? "neutral"} size="sm">
          {ACAO_LABEL[l.acao] ?? l.acao}
        </Badge>
      ),
    },
    { header: "Entidade", cell: (l) => <span className="font-mono-caps text-label-sm uppercase text-outline">{l.entidade}</span> },
    { header: "Detalhes", cell: (l) => <span className="text-body-sm">{l.detalhes ?? "—"}</span> },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Rastro Digital (Log de Auditoria)</h1>
        <BackButton href="/configuracoes" />
      </div>
      <p className="max-w-2xl text-body-sm text-outline">
        Cada ação no sistema fica registrada com usuário, data, horário e item afetado — quem fez o quê, e quando.
      </p>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <div className="w-64">
          <SearchBox placeholder="Buscar por usuário ou detalhe..." valorAtual={q} hiddenParams={{ acao, entidade }} />
        </div>
        <div>
          <select
            name="acao"
            defaultValue={acao ?? ""}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          >
            <option value="">Todas as ações</option>
            {Object.entries(ACAO_LABEL).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            name="entidade"
            defaultValue={entidade ?? ""}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          >
            <option value="">Todas as entidades</option>
            {ENTIDADES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-body-sm font-medium text-on-primary">
          Filtrar
        </button>
        {(q || acao || entidade) && (
          <LinkButton href="/configuracoes/auditoria" variant="text" size="sm">
            Limpar
          </LinkButton>
        )}
      </form>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(l) => l.id}
        empty={
          <EmptyState
            icon={q || acao || entidade ? SearchX : ClipboardList}
            title={q || acao || entidade ? "Nenhum evento encontrado" : "Nenhum evento registrado ainda"}
          />
        }
      />

      <Pagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={total} baseParams={{ q, acao, entidade }} />
    </div>
  );
}
