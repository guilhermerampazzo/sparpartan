import { desc, eq, or, ilike, count } from "drizzle-orm";
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
} from "@/components/ui";
import { statusDocumento } from "@/lib/status";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;

  const filtroGerados = q
    ? or(ilike(clientes.nome, `%${q}%`), ilike(modelosDocumento.nome, `%${q}%`))
    : undefined;

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
        <div className="flex items-center justify-between">
          <h2 className="font-display text-title-lg font-semibold text-primary">
            Documentos Gerados
          </h2>
          <SearchBox placeholder="Buscar por cliente ou modelo..." valorAtual={q} />
        </div>

        {gerados.length === 0 ? (
          <EmptyState icon={FileText} title={q ? "Nenhum documento encontrado" : "Nenhum documento gerado ainda"} />
        ) : (
          <div className="space-y-6">
            {[...porCliente.entries()].map(([clienteNome, docs]) => {
              const docsComPdf = docs.filter((doc) => doc.pdfCaminho);
              return (
                <div key={clienteNome} className="rounded-xl border border-outline-variant bg-surface-container-lowest">
                  <div className="border-b border-outline-variant px-4 py-2">
                    <span className="font-display text-title-sm font-semibold text-primary">{clienteNome}</span>
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

        <Pagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={total} baseParams={{ q }} />
      </div>
    </div>
  );
}
