import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { HardHat, Eye, Download, Trash2, FilePlus } from "lucide-react";
import { db } from "@/db";
import { obras, clientes, documentosGerados } from "@/db/schema";
import { LinkButton, ConfirmButton, EmptyState, DataTable, Badge, type Column, BackButton } from "@/components/ui";
import { excluirObra } from "./actions";
import { statusObra } from "@/lib/status";

const STATUS_OBRAS = [
  { key: "em_projeto", label: "Em Projeto" },
  { key: "em_execucao", label: "Em Execução" },
  { key: "concluida", label: "Concluídas" },
] as const;

type LinhaObra = {
  id: string;
  titulo: string | null;
  tipoObra: string | null;
  status: string;
  clienteId: string;
  clienteNome: string;
  documentoId: string | null;
};

export default async function ObrasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusValido = STATUS_OBRAS.some((s) => s.key === status) ? status : undefined;

  const lista = await db
    .select({
      id: obras.id,
      titulo: obras.titulo,
      tipoObra: obras.tipoObra,
      status: obras.status,
      clienteId: obras.clienteId,
      clienteNome: clientes.nome,
    })
    .from(obras)
    .innerJoin(clientes, eq(obras.clienteId, clientes.id))
    .where(
      and(
        isNull(obras.excluidoEm),
        isNull(clientes.excluidoEm),
        statusValido ? eq(obras.status, statusValido as (typeof STATUS_OBRAS)[number]["key"]) : undefined
      )
    )
    .orderBy(desc(obras.criadoEm));

  const obraIds = lista.map((o) => o.id);
  const documentos = new Map<string, string>();
  if (obraIds.length > 0) {
    const comPdf = await db
      .select({ obraId: documentosGerados.obraId, id: documentosGerados.id, pdfCaminho: documentosGerados.pdfCaminho })
      .from(documentosGerados)
      .where(sql`${documentosGerados.pdfCaminho} is not null`)
      .then((rows) => rows.filter((r) => r.obraId));
    for (const r of comPdf) {
      if (!documentos.has(r.obraId!)) documentos.set(r.obraId!, r.id);
    }
  }

  const linhas: LinhaObra[] = lista.map((o) => ({
    ...o,
    documentoId: documentos.get(o.id) ?? null,
  }));

  const columns: Column<LinhaObra>[] = [
    { header: "Proprietário", cell: (o) => <span className="font-medium text-primary">{o.clienteNome}</span> },
    { header: "Tipo", cell: (o) => o.tipoObra ?? "—" },
    { header: "Título", cell: (o) => o.titulo ?? "(sem título)" },
    { header: "Fase", cell: (o) => <Badge tone={statusObra(o.status).tone} size="sm">{statusObra(o.status).label}</Badge> },
    {
      header: "",
      align: "right",
      cell: (o) => {
        const excluirComId = excluirObra.bind(null, o.id);
        return (
          <div className="flex items-center justify-end gap-2">
            <LinkButton href={`/obras/${o.id}`} variant="text" size="sm" icon={Eye}>
              Visualizar
            </LinkButton>
            {o.documentoId ? (
              <LinkButton
                href={`/api/documentos/${o.documentoId}?tipo=pdf`}
                variant="text"
                size="sm"
                icon={Download}
              >
                Baixar
              </LinkButton>
            ) : (
              <LinkButton
                href={`/documentos/gerar?clienteId=${o.clienteId}&obraId=${o.id}`}
                variant="text"
                size="sm"
                icon={FilePlus}
              >
                Baixar
              </LinkButton>
            )}
            <form action={excluirComId}>
              <ConfirmButton
                mensagem={`Excluir a obra "${o.titulo ?? "(sem título)"}"?`}
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
      <BackButton href="/documentos" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Obras</h1>
        <LinkButton href="/obras/novo">+ Nova Obra</LinkButton>
      </div>
      <p className="text-body-sm text-outline">
        Cadastro técnico para o Memorial Descritivo e o Requerimento 2-B-1 da NORMAM-303
        (preenchimento de obras — trapiches, flutuantes, marinas).
      </p>

      <div className="flex gap-2">
        <LinkButton href="/obras" variant={!statusValido ? "filled" : "outlined"} size="sm">
          Todas
        </LinkButton>
        {STATUS_OBRAS.map((s) => (
          <LinkButton
            key={s.key}
            href={`/obras?status=${s.key}`}
            variant={statusValido === s.key ? "filled" : "outlined"}
            size="sm"
          >
            {s.label}
          </LinkButton>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={linhas}
        rowKey={(o) => o.id}
        empty={
          <EmptyState
            icon={HardHat}
            title="Nenhuma obra cadastrada ainda"
            action={{ label: "+ Nova Obra", href: "/obras/novo" }}
          />
        }
      />
    </div>
  );
}
