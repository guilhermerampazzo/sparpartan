import { and, desc, eq, isNull, or, ilike, inArray, sql } from "drizzle-orm";
import { Folder, FolderOpen, SearchX } from "lucide-react";
import { db } from "@/db";
import {
  arquivos,
  clientes,
  taxasPagar,
  embarcacaoFotos,
  embarcacoes,
  documentosGerados,
  modelosDocumento,
} from "@/db/schema";
import { EmptyState, SearchBox } from "@/components/ui";
import { LinhaArquivo, UploadArquivoCliente } from "./arquivo-actions";

type ItemPasta = {
  id: string;
  nome: string;
  tipo: string;
  rotaApi: string;
  /** Somente arquivos da tabela `arquivos` podem ser editados/excluídos aqui. */
  editavel: boolean;
};

export default async function ArquivosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const filtroCliente = q
    ? or(ilike(clientes.nome, `%${q}%`), ilike(clientes.cpfCnpj, `%${q}%`))
    : undefined;

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome, cpfCnpj: clientes.cpfCnpj })
    .from(clientes)
    .where(and(isNull(clientes.excluidoEm), filtroCliente))
    .orderBy(clientes.nome);

  const clienteIds = listaClientes.map((c) => c.id);

  // Fontes de arquivos por cliente: documentos enviados + taxas com boleto +
  // fotos de embarcação + documentos gerados (DOCX/PDF).
  const arquivosCliente = clienteIds.length > 0
    ? await db
        .select({ id: arquivos.id, nomeOriginal: arquivos.nomeOriginal, tipo: arquivos.tipo, clienteId: arquivos.clienteId })
        .from(arquivos)
        .where(inArray(arquivos.clienteId, clienteIds))
        .orderBy(desc(arquivos.criadoEm))
    : [];

  const taxasComBoleto = clienteIds.length > 0
    ? await db
        .select({ id: taxasPagar.id, descricao: taxasPagar.descricao, clienteId: taxasPagar.clienteId })
        .from(taxasPagar)
        .where(and(inArray(taxasPagar.clienteId, clienteIds), sql`${taxasPagar.arquivoCaminho} is not null`))
        .orderBy(desc(taxasPagar.criadoEm))
    : [];

  const fotosEmbarcacao = clienteIds.length > 0
    ? await db
        .select({
          id: embarcacaoFotos.id,
          embarcacaoNome: embarcacoes.nome,
          clienteId: embarcacoes.clienteId,
        })
        .from(embarcacaoFotos)
        .innerJoin(embarcacoes, eq(embarcacaoFotos.embarcacaoId, embarcacoes.id))
        .where(inArray(embarcacoes.clienteId, clienteIds))
    : [];

  const docsGerados = clienteIds.length > 0
    ? await db
        .select({
          id: documentosGerados.id,
          modeloNome: modelosDocumento.nome,
          clienteId: documentosGerados.clienteId,
          docxCaminho: documentosGerados.docxCaminho,
          pdfCaminho: documentosGerados.pdfCaminho,
        })
        .from(documentosGerados)
        .innerJoin(modelosDocumento, eq(documentosGerados.modeloId, modelosDocumento.id))
        .where(inArray(documentosGerados.clienteId, clienteIds))
        .orderBy(desc(documentosGerados.criadoEm))
    : [];

  const porCliente = new Map<string, ItemPasta[]>();
  for (const a of arquivosCliente) {
    const lista = porCliente.get(a.clienteId!) ?? [];
    lista.push({
      id: a.id,
      nome: a.nomeOriginal,
      tipo: a.tipo ?? "Documento",
      rotaApi: `/api/arquivos/${a.id}`,
      editavel: true,
    });
    porCliente.set(a.clienteId!, lista);
  }
  for (const t of taxasComBoleto) {
    const lista = porCliente.get(t.clienteId!) ?? [];
    lista.push({
      id: t.id,
      nome: `${t.descricao} (taxa)`,
      tipo: "Taxa",
      rotaApi: `/api/taxas/${t.id}`,
      editavel: false,
    });
    porCliente.set(t.clienteId!, lista);
  }
  for (const f of fotosEmbarcacao) {
    const lista = porCliente.get(f.clienteId!) ?? [];
    lista.push({
      id: f.id,
      nome: `Foto — ${f.embarcacaoNome ?? "embarcação"}`,
      tipo: "Foto",
      rotaApi: `/api/embarcacao-fotos/${f.id}`,
      editavel: false,
    });
    porCliente.set(f.clienteId!, lista);
  }
  for (const d of docsGerados) {
    const lista = porCliente.get(d.clienteId!) ?? [];
    if (d.docxCaminho) {
      lista.push({
        id: `${d.id}-docx`,
        nome: `${d.modeloNome}.docx`,
        tipo: "Documento gerado",
        rotaApi: `/api/documentos/${d.id}?tipo=docx`,
        editavel: false,
      });
    }
    if (d.pdfCaminho) {
      lista.push({
        id: `${d.id}-pdf`,
        nome: `${d.modeloNome}.pdf`,
        tipo: "Documento gerado",
        rotaApi: `/api/documentos/${d.id}?tipo=pdf`,
        editavel: false,
      });
    }
    porCliente.set(d.clienteId!, lista);
  }

  const totalArquivos = [...porCliente.values()].reduce((acc, lista) => acc + lista.length, 0);

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">Arquivos</h1>
          <p className="text-body-sm text-outline">
            Uma pasta por cliente com tudo que foi enviado: documentos, taxas/boletos, fotos de
            embarcações e documentos gerados.
          </p>
        </div>
        <SearchBox placeholder="Buscar por nome ou CPF do cliente..." valorAtual={q} />
      </div>

      {listaClientes.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <EmptyState
            icon={SearchX}
            title={q ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {listaClientes.map((c) => {
            const itens = porCliente.get(c.id) ?? [];
            return (
              <div
                key={c.id}
                className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-pill bg-primary-container p-2 text-on-primary-container">
                      <FolderOpen size={16} />
                    </span>
                    <div>
                      <p className="font-display text-title-sm font-semibold text-primary">{c.nome}</p>
                      <p className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                        {c.cpfCnpj}
                      </p>
                    </div>
                  </div>
                  <span className="text-body-sm text-outline">
                    {itens.length} arquivo(s)
                  </span>
                </div>

                {itens.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-body-sm text-outline">
                    <Folder size={14} /> Pasta vazia — adicione um arquivo abaixo.
                  </div>
                ) : (
                  <ul className="divide-y divide-outline-variant">
                    {itens.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                        <LinhaArquivo
                          id={item.id}
                          nomeOriginal={item.nome}
                          tipo={item.tipo}
                          rotaApi={item.rotaApi}
                          editavel={item.editavel}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t border-outline-variant bg-surface-container-low px-4 py-3">
                  <UploadArquivoCliente clienteId={c.id} />
                </div>
              </div>
            );
          })}

          <p className="text-body-sm text-outline">
            Total: {totalArquivos} arquivo(s) em {listaClientes.length} pasta(s).
          </p>
        </div>
      )}
    </div>
  );
}
