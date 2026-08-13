import { and, asc, desc, eq, isNull, or, ilike, inArray, sql } from "drizzle-orm";
import { Folder, FolderOpen, SearchX, ChevronDown } from "lucide-react";
import { db } from "@/db";
import {
  arquivos,
  arquivoAlteracoes,
  clientes,
  taxasPagar,
  embarcacaoFotos,
  embarcacoes,
  documentosGerados,
  modelosDocumento,
  obraFotos,
  obras,
  processos,
  servicos,
  usuarios,
} from "@/db/schema";
import { Button, EmptyState, LinkButton, SearchBox, BackButton } from "@/components/ui";
import { CampoSelect } from "@/components/ui/form-field";
import { LinhaArquivo, UploadArquivoCliente } from "./arquivo-actions";

type ItemPasta = {
  id: string;
  nome: string;
  tipo: string;
  rotaApi: string;
  /** Somente arquivos da tabela `arquivos` podem ser editados/excluídos aqui. */
  editavel: boolean;
  embarcacaoId?: string | null;
  processoId?: string | null;
  historico?: { criadoEm: Date; texto: string }[];
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ArquivosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; embarcacaoId?: string; processoId?: string }>;
}) {
  const { q, embarcacaoId, processoId } = await searchParams;
  const embarcacaoFiltro = embarcacaoId && UUID_RE.test(embarcacaoId) ? embarcacaoId : undefined;
  const processoFiltro = processoId && UUID_RE.test(processoId) ? processoId : undefined;

  const filtroCliente = q
    ? or(ilike(clientes.nome, `%${q}%`), ilike(clientes.cpfCnpj, `%${q}%`))
    : undefined;

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome, cpfCnpj: clientes.cpfCnpj })
    .from(clientes)
    .where(and(isNull(clientes.excluidoEm), filtroCliente))
    .orderBy(clientes.nome);

  const clienteIds = listaClientes.map((c) => c.id);

  // Listas para os filtros de embarcação e processo.
  const listaEmbarcacoes = await db
    .select({
      id: embarcacoes.id,
      nome: embarcacoes.nome,
      clienteId: embarcacoes.clienteId,
    })
    .from(embarcacoes)
    .where(isNull(embarcacoes.excluidoEm))
    .orderBy(embarcacoes.nome);

  const listaProcessos = await db
    .select({
      id: processos.id,
      servicoNome: servicos.nome,
      clienteId: processos.clienteId,
    })
    .from(processos)
    .innerJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(isNull(processos.excluidoEm))
    .orderBy(servicos.nome);

  const filtraItem = (item: ItemPasta) =>
    (!embarcacaoFiltro || item.embarcacaoId === embarcacaoFiltro) &&
    (!processoFiltro || item.processoId === processoFiltro);

  // Fontes de arquivos por cliente: documentos enviados + taxas com boleto +
  // fotos de embarcação + fotos de obras + comprovantes de protocolo +
  // documentos gerados (DOCX/PDF).
  const arquivosCliente = clienteIds.length > 0
    ? await db
        .select({
          id: arquivos.id,
          nomeOriginal: arquivos.nomeOriginal,
          tipo: arquivos.tipo,
          clienteId: arquivos.clienteId,
          embarcacaoId: arquivos.embarcacaoId,
          processoId: arquivos.processoId,
          criadoPorId: arquivos.criadoPorId,
          atualizadoPorId: arquivos.atualizadoPorId,
          atualizadoEm: arquivos.atualizadoEm,
          criadoEm: arquivos.criadoEm,
        })
        .from(arquivos)
        .where(inArray(arquivos.clienteId, clienteIds))
        .orderBy(desc(arquivos.criadoEm))
    : [];

  // Histórico da pasta digital: alterações por arquivo + nomes dos usuários.
  const arquivoIds = arquivosCliente.map((a) => a.id);
  const alteracoesArquivo = arquivoIds.length > 0
    ? await db
        .select({
          id: arquivoAlteracoes.id,
          arquivoId: arquivoAlteracoes.arquivoId,
          acao: arquivoAlteracoes.acao,
          usuarioId: arquivoAlteracoes.usuarioId,
          criadoEm: arquivoAlteracoes.criadoEm,
        })
        .from(arquivoAlteracoes)
        .where(inArray(arquivoAlteracoes.arquivoId, arquivoIds))
        .orderBy(asc(arquivoAlteracoes.criadoEm))
    : [];

  const usuarioIds = [
    ...new Set([
      ...arquivosCliente.map((a) => a.criadoPorId).filter(Boolean),
      ...arquivosCliente.map((a) => a.atualizadoPorId).filter(Boolean),
      ...alteracoesArquivo.map((a) => a.usuarioId).filter(Boolean),
    ]),
  ] as string[];
  const usuariosMap = new Map<string, string>();
  if (usuarioIds.length > 0) {
    const linhasUsuarios = await db.select({ id: usuarios.id, nome: usuarios.nome }).from(usuarios).where(inArray(usuarios.id, usuarioIds));
    for (const u of linhasUsuarios) usuariosMap.set(u.id, u.nome);
  }
  const nomeUsuario = (id: string | null | undefined) => (id ? usuariosMap.get(id) ?? "Sistema" : "Sistema");

  const taxasComBoleto = clienteIds.length > 0
    ? await db
        .select({
          id: taxasPagar.id,
          descricao: taxasPagar.descricao,
          clienteId: taxasPagar.clienteId,
          processoId: taxasPagar.processoId,
        })
        .from(taxasPagar)
        .where(and(inArray(taxasPagar.clienteId, clienteIds), sql`${taxasPagar.arquivoCaminho} is not null`))
        .orderBy(desc(taxasPagar.criadoEm))
    : [];

  const fotosEmbarcacao = clienteIds.length > 0
    ? await db
        .select({
          id: embarcacaoFotos.id,
          embarcacaoNome: embarcacoes.nome,
          embarcacaoId: embarcacaoFotos.embarcacaoId,
          clienteId: embarcacoes.clienteId,
        })
        .from(embarcacaoFotos)
        .innerJoin(embarcacoes, eq(embarcacaoFotos.embarcacaoId, embarcacoes.id))
        .where(inArray(embarcacoes.clienteId, clienteIds))
    : [];

  const fotosObras = clienteIds.length > 0
    ? await db
        .select({
          id: obraFotos.id,
          obraTitulo: obras.titulo,
          clienteId: obras.clienteId,
        })
        .from(obraFotos)
        .innerJoin(obras, eq(obraFotos.obraId, obras.id))
        .where(inArray(obras.clienteId, clienteIds))
    : [];

  const comprovantesProtocolo = clienteIds.length > 0
    ? await db
        .select({
          id: processos.id,
          numeroProtocolo: processos.numeroProtocolo,
          clienteId: processos.clienteId,
        })
        .from(processos)
        .where(and(inArray(processos.clienteId, clienteIds), sql`${processos.protocoloEscaneadoCaminho} is not null`))
    : [];

  const docsGerados = clienteIds.length > 0
    ? await db
        .select({
          id: documentosGerados.id,
          modeloNome: modelosDocumento.nome,
          clienteId: documentosGerados.clienteId,
          embarcacaoId: documentosGerados.embarcacaoId,
          processoId: documentosGerados.processoId,
          docxCaminho: documentosGerados.docxCaminho,
          pdfCaminho: documentosGerados.pdfCaminho,
        })
        .from(documentosGerados)
        .innerJoin(modelosDocumento, eq(documentosGerados.modeloId, modelosDocumento.id))
        .where(inArray(documentosGerados.clienteId, clienteIds))
        .orderBy(desc(documentosGerados.criadoEm))
    : [];

  const porCliente = new Map<string, ItemPasta[]>();
  const adicionar = (clienteId: string, item: ItemPasta) => {
    const lista = porCliente.get(clienteId) ?? [];
    lista.push(item);
    porCliente.set(clienteId, lista);
  };

  for (const a of arquivosCliente) {
    adicionar(a.clienteId!, {
      id: a.id,
      nome: a.nomeOriginal,
      tipo: a.tipo ?? "Documento",
      rotaApi: `/api/arquivos/${a.id}`,
      editavel: true,
      embarcacaoId: a.embarcacaoId,
      processoId: a.processoId,
      historico: [
        ...(a.criadoEm
          ? [{ criadoEm: a.criadoEm, texto: `Arquivo enviado por ${nomeUsuario(a.criadoPorId)}` }]
          : []),
        ...(a.atualizadoEm && a.atualizadoPorId
          ? [{ criadoEm: a.atualizadoEm, texto: `Alterado por ${nomeUsuario(a.atualizadoPorId)}` }]
          : []),
        ...alteracoesArquivo
          .filter((al) => al.arquivoId === a.id)
          .map((al) => ({ criadoEm: al.criadoEm, texto: `${al.acao} — por ${nomeUsuario(al.usuarioId)}` })),
      ],
    });
  }
  for (const t of taxasComBoleto) {
    adicionar(t.clienteId!, {
      id: t.id,
      nome: `${t.descricao} (taxa)`,
      tipo: "Taxa",
      rotaApi: `/api/taxas/${t.id}`,
      editavel: false,
      processoId: t.processoId,
    });
  }
  for (const f of fotosEmbarcacao) {
    adicionar(f.clienteId!, {
      id: f.id,
      nome: `Foto — ${f.embarcacaoNome ?? "embarcação"}`,
      tipo: "Foto",
      rotaApi: `/api/embarcacao-fotos/${f.id}`,
      editavel: false,
      embarcacaoId: f.embarcacaoId,
    });
  }
  for (const fo of fotosObras) {
    adicionar(fo.clienteId!, {
      id: fo.id,
      nome: `Foto — obra ${fo.obraTitulo ?? "(sem título)"}`,
      tipo: "Foto de obra",
      rotaApi: `/api/obra-fotos/${fo.id}`,
      editavel: false,
    });
  }
  for (const cp of comprovantesProtocolo) {
    adicionar(cp.clienteId!, {
      id: cp.id,
      nome: `Comprovante de protocolo${cp.numeroProtocolo ? ` — ${cp.numeroProtocolo}` : ""}`,
      tipo: "Protocolo",
      rotaApi: `/api/processos/${cp.id}/comprovante`,
      editavel: false,
      processoId: cp.id,
    });
  }
  for (const d of docsGerados) {
    if (d.docxCaminho) {
      adicionar(d.clienteId!, {
        id: `${d.id}-docx`,
        nome: `${d.modeloNome}.docx`,
        tipo: "Documento gerado",
        rotaApi: `/api/documentos/${d.id}?tipo=docx`,
        editavel: false,
        embarcacaoId: d.embarcacaoId,
        processoId: d.processoId,
      });
    }
    if (d.pdfCaminho) {
      adicionar(d.clienteId!, {
        id: `${d.id}-pdf`,
        nome: `${d.modeloNome}.pdf`,
        tipo: "Documento gerado",
        rotaApi: `/api/documentos/${d.id}?tipo=pdf`,
        editavel: false,
        embarcacaoId: d.embarcacaoId,
        processoId: d.processoId,
      });
    }
  }

  const totalArquivos = [...porCliente.values()].reduce(
    (acc, lista) => acc + lista.filter(filtraItem).length,
    0
  );

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <div>
        <h1 className="font-display text-headline-lg font-bold text-primary">Arquivos</h1>
        <p className="text-body-sm text-outline">
          Repositório de tudo que entra no sistema: documentos enviados no cadastro do cliente e da
          embarcação, taxas/boletos, fotos, comprovantes de protocolo e documentos gerados — tudo
          reunido e filtrável por cliente, embarcação e processo.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form method="get" className="flex flex-wrap items-end gap-2">
          <div className="w-64">
            <CampoSelect
              label="Filtrar por embarcação"
              name="embarcacaoId"
              defaultValue={embarcacaoFiltro ?? ""}
              options={[
                { value: "", label: "Todas as embarcações" },
                ...listaEmbarcacoes.map((e) => ({ value: e.id, label: e.nome })),
              ]}
            />
          </div>
          <div className="w-64">
            <CampoSelect
              label="Filtrar por processo"
              name="processoId"
              defaultValue={processoFiltro ?? ""}
              options={[
                { value: "", label: "Todos os processos" },
                ...listaProcessos.map((p) => ({ value: p.id, label: p.servicoNome })),
              ]}
            />
          </div>
          <Button type="submit" variant="outlined" size="sm">
            Filtrar
          </Button>
          {(embarcacaoFiltro || processoFiltro) && (
            <LinkButton href="/arquivos" variant="text" size="sm">
              Limpar
            </LinkButton>
          )}
        </form>
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
        <div className="space-y-4">
          {listaClientes.map((c) => {
            const itens = (porCliente.get(c.id) ?? []).filter(filtraItem);
            return (
              <details
                key={c.id}
                className="group overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest"
                open={itens.length > 0 && listaClientes.length <= 5}
              >
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3 hover:bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <span className="rounded-pill bg-primary-container p-2 text-on-primary-container">
                      <FolderOpen size={16} />
                    </span>
                    <div>
                      <p className="font-display text-title-sm font-semibold text-primary">
                        {c.nome} <span className="text-outline">▸</span>
                      </p>
                      <p className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                        {c.cpfCnpj}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-3 text-body-sm text-outline">
                    {itens.length} arquivo(s)
                    <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                  </span>
                </summary>

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
                          historico={item.historico}
                        />
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t border-outline-variant bg-surface-container-low px-4 py-3">
                  <UploadArquivoCliente clienteId={c.id} />
                </div>
              </details>
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
