import { desc, eq, or, ilike, count, and } from "drizzle-orm";
import { FileText } from "lucide-react";
import { db } from "@/db";
import { modelosDocumento, documentosGerados, clientes } from "@/db/schema";
import {
  StatusBadge,
  LinkButton,
  EmptyState,
  SearchBox,
  Pagination,
  paginar,
  Button,
} from "@/components/ui";
import { CampoSelect } from "@/components/ui/form-field";
import { statusDocumento } from "@/lib/status";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; clienteId?: string }>;
}) {
  const { q, page, clienteId } = await searchParams;
  const clienteFiltro = clienteId && UUID_RE.test(clienteId) ? clienteId : undefined;

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  const filtroGerados = and(
    q ? or(ilike(clientes.nome, `%${q}%`), ilike(modelosDocumento.nome, `%${q}%`)) : undefined,
    clienteFiltro ? eq(documentosGerados.clienteId, clienteFiltro) : undefined
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(documentosGerados)
    .innerJoin(modelosDocumento, eq(documentosGerados.modeloId, modelosDocumento.id))
    .innerJoin(clientes, eq(documentosGerados.clienteId, clientes.id))
    .where(filtroGerados);

  const { limit, offset, paginaAtual, totalPaginas } = paginar(Number(page) || 1, total);

  const gerados = await db
    .select({
      id: documentosGerados.id,
      criadoEm: documentosGerados.criadoEm,
      status: documentosGerados.status,
      modeloNome: modelosDocumento.nome,
      clienteNome: clientes.nome,
      pdfCaminho: documentosGerados.pdfCaminho,
    })
    .from(documentosGerados)
    .innerJoin(modelosDocumento, eq(documentosGerados.modeloId, modelosDocumento.id))
    .innerJoin(clientes, eq(documentosGerados.clienteId, clientes.id))
    .where(filtroGerados)
    .orderBy(desc(documentosGerados.criadoEm))
    .limit(limit)
    .offset(offset);

  const porCliente = new Map<string, typeof gerados>();
  for (const doc of gerados) {
    const lista = porCliente.get(doc.clienteNome) ?? [];
    lista.push(doc);
    porCliente.set(doc.clienteNome, lista);
  }

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Documentos</h1>
        <div className="flex gap-3">
          <LinkButton href="/documentos/vencimentos" variant="outlined" size="sm">
            Vencimentos
          </LinkButton>
          <LinkButton href="/documentos/gerar">+ Gerar Documento</LinkButton>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-title-lg font-semibold text-primary">
            Documentos Gerados
          </h2>
          <div className="flex flex-wrap items-end gap-2">
            <form method="get" className="flex items-end gap-2">
              <div className="w-56">
                <CampoSelect
                  label="Filtrar por cliente"
                  name="clienteId"
                  defaultValue={clienteFiltro ?? ""}
                  options={[
                    { value: "", label: "Todos os clientes" },
                    ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
                  ]}
                />
              </div>
              <Button type="submit" variant="outlined" size="sm">
                Filtrar
              </Button>
              {clienteFiltro && (
                <LinkButton href="/documentos" variant="text" size="sm">
                  Limpar
                </LinkButton>
              )}
            </form>
            <SearchBox placeholder="Buscar por cliente ou modelo..." valorAtual={q} hiddenParams={{ clienteId: clienteFiltro }} />
          </div>
        </div>

        {gerados.length === 0 ? (
          <EmptyState icon={FileText} title={q || clienteFiltro ? "Nenhum documento encontrado" : "Nenhum documento gerado ainda"} />
        ) : (
          <div className="space-y-6">
            {[...porCliente.entries()].map(([clienteNome, docs]) => {
              const docsComPdf = docs.filter((doc) => doc.pdfCaminho);
              return (
                <div key={clienteNome} className="rounded-xl border border-outline-variant bg-surface-container-lowest">
                  <div className="border-b border-outline-variant px-4 py-2">
                    <span className="font-display text-title-sm font-semibold text-primary">{clienteNome}</span>
                    <span className="ml-2 text-body-sm text-outline">{docs.length} documento(s)</span>
                  </div>
                  <form action="/api/documentos/mesclar" method="post">
                    <ul className="divide-y divide-outline-variant">
                      {docs.map((doc) => (
                        <li key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low">
                          {doc.pdfCaminho ? (
                            <input
                              type="checkbox"
                              name="ids"
                              value={doc.id}
                              className="size-4 shrink-0 accent-primary"
                              aria-label={`Selecionar ${doc.modeloNome}`}
                            />
                          ) : (
                            <span className="size-4 shrink-0" />
                          )}
                          <a
                            href={`/documentos/${doc.id}`}
                            className="flex flex-1 items-center justify-between gap-4"
                          >
                            <span className="text-body-md text-primary">{doc.modeloNome}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-body-sm text-outline">
                                {new Date(doc.criadoEm).toLocaleDateString("pt-BR")}
                              </span>
                              <StatusBadge status={statusDocumento(doc.status)} size="sm" />
                            </div>
                          </a>
                        </li>
                      ))}
                    </ul>
                    {docsComPdf.length > 1 && (
                      <div className="border-t border-outline-variant px-4 py-3">
                        <button
                          type="submit"
                          className="rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm font-medium text-primary hover:bg-surface-container-low"
                        >
                          Baixar selecionados como 1 PDF
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              );
            })}
          </div>
        )}

        <Pagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={total} baseParams={{ q, clienteId: clienteFiltro }} />
      </div>
    </div>
  );
}
