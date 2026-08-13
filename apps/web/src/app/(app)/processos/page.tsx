import { and, desc, eq, isNull, or, ilike, count, inArray } from "drizzle-orm";
import { FolderClock } from "lucide-react";
import { db } from "@/db";
import { processos, clientes, servicos } from "@/db/schema";
import {
  StatusBadge,
  Badge,
  LinkButton,
  EmptyState,
  DataTable,
  SearchBox,
  Pagination,
  paginar,
  type Column,
  BackButton,
} from "@/components/ui";
import { statusProcesso, urgenciaVencimento, infoUrgencia, vencimentoProtocolo } from "@/lib/status";

type LinhaProcesso = {
  id: string;
  status: string;
  numeroProtocolo: string | null;
  dataProtocolo: string | null;
  clienteNome: string;
  servicoNome: string;
};

const ABAS = [
  { key: "geral", label: "Geral", status: null as string[] | null },
  { key: "andamento", label: "Em Andamento", status: ["aberto", "processo_preenchido", "processo_assinado", "aguardando_pagamento"] },
  { key: "protocolado", label: "Protocolado", status: ["protocolado"] },
  { key: "pagamento", label: "Pagamento", status: ["aguardando_pagamento"] },
  { key: "prontos", label: "Concluídos", status: ["concluido"] },
] as const;

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; aba?: string; status?: string }>;
}) {
  const { q, page, aba: abaParam, status: statusParam } = await searchParams;
  const STATUS_VALIDOS = new Set(["aberto", "documentos_pendentes", "pronto_para_protocolo", "protocolado", "aguardando_retorno_marinha", "concluido", "cancelado"]);
  const statusDireto = statusParam && STATUS_VALIDOS.has(statusParam) ? statusParam : undefined;
  const aba = ABAS.find((a) => a.key === abaParam) ?? ABAS[0];

  const condicoes = [isNull(processos.excluidoEm)];
  if (q) {
    condicoes.push(
      or(
        ilike(clientes.nome, `%${q}%`),
        ilike(servicos.nome, `%${q}%`),
        ilike(processos.numeroProtocolo, `%${q}%`)
      )!
    );
  }
  if (statusDireto) {
    condicoes.push(eq(processos.status, statusDireto as (typeof processos.status.enumValues)[number]));
  } else if (aba.status) {
    condicoes.push(inArray(processos.status, aba.status as (typeof processos.status.enumValues)[number][]));
  }
  const filtro = and(...condicoes);

  const [{ total }] = await db
    .select({ total: count() })
    .from(processos)
    .innerJoin(clientes, eq(processos.clienteId, clientes.id))
    .innerJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(filtro);

  const { limit, offset, paginaAtual, totalPaginas } = paginar(Number(page) || 1, total);

  const lista = await db
    .select({
      id: processos.id,
      status: processos.status,
      numeroProtocolo: processos.numeroProtocolo,
      dataProtocolo: processos.dataProtocolo,
      criadoEm: processos.criadoEm,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
    })
    .from(processos)
    .innerJoin(clientes, eq(processos.clienteId, clientes.id))
    .innerJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(filtro)
    .orderBy(desc(processos.criadoEm))
    .limit(limit)
    .offset(offset);

  const columns: Column<LinhaProcesso>[] = [
    { header: "Cliente", cell: (p) => <span className="font-medium text-primary">{p.clienteNome}</span> },
    { header: "Serviço", cell: (p) => p.servicoNome },
    { header: "Status", cell: (p) => <StatusBadge status={statusProcesso(p.status)} /> },
    { header: "Protocolo", cell: (p) => p.numeroProtocolo ?? "—" },
    {
      header: "Vencimento do Protocolo",
      cell: (p) => {
        if (p.status !== "protocolado" || !p.dataProtocolo) return "—";
        const urgencia = urgenciaVencimento(vencimentoProtocolo(p.dataProtocolo));
        return (
          <Badge tone={infoUrgencia(urgencia).tone} size="sm">
            {infoUrgencia(urgencia).label}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Processos</h1>
        <p className="text-body-sm text-outline">
          Processos são os serviços em execução para cada cliente — cadastre pelo Novo Cliente.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <LinkButton
            key={a.key}
            href={`/processos${a.key === "geral" ? "" : `?aba=${a.key}`}`}
            variant={aba.key === a.key ? "filled" : "outlined"}
            size="sm"
          >
            {a.label}
          </LinkButton>
        ))}
      </div>

      <SearchBox placeholder="Buscar por cliente, serviço ou protocolo..." valorAtual={q} />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(p) => p.id}
        rowHref={(p) => `/processos/${p.id}`}
        empty={
          <EmptyState
            icon={FolderClock}
            title={q ? "Nenhum processo encontrado" : "Nenhum processo nessa aba"}
          />
        }
      />

      <Pagination
        paginaAtual={paginaAtual}
        totalPaginas={totalPaginas}
        totalRegistros={total}
        baseParams={{ q, aba: aba.key === "geral" ? undefined : aba.key, status: statusDireto }}
      />
    </div>
  );
}
