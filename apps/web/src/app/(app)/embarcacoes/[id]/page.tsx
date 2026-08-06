import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@/db";
import { embarcacoes, motores, aquisicoes, salvatagemItens, clientes, embarcacaoFotos, processos, servicos, documentosGerados, modelosDocumento, orcamentos, arquivos } from "@/db/schema";
import { Trash2, FileText, FileStack, Receipt, FolderOpen } from "lucide-react";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { StatusBadge, Button, Badge, LinkButton, BackButton, ConfirmButton, EmptyState } from "@/components/ui";
import { CadastradoPor } from "@/components/ui/cadastrado-por";
import { urgenciaVencimento, infoUrgencia, statusDocumento, statusOrcamento, statusProcesso } from "@/lib/status";
import { adicionarItemSalvatagem } from "./actions";
import { excluirEmbarcacao, enviarFotoEmbarcacao, removerFotoEmbarcacao } from "../actions";

function formatMoney(v: string | number | null) {
  return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function EmbarcacaoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [embarcacao] = await db.select().from(embarcacoes).where(eq(embarcacoes.id, id)).limit(1);
  if (!embarcacao) notFound();

  const [proprietario] = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .where(eq(clientes.id, embarcacao.clienteId))
    .limit(1);

  const motoresDaEmbarcacao = await db
    .select()
    .from(motores)
    .where(eq(motores.embarcacaoId, id))
    .orderBy(motores.ordem);

  const aquisicoesDaEmbarcacao = await db
    .select()
    .from(aquisicoes)
    .where(eq(aquisicoes.embarcacaoId, id));

  const salvatagemDaEmbarcacao = await db
    .select()
    .from(salvatagemItens)
    .where(eq(salvatagemItens.embarcacaoId, id));

  const fotosDaEmbarcacao = await db
    .select()
    .from(embarcacaoFotos)
    .where(eq(embarcacaoFotos.embarcacaoId, id));

  const processosDaEmbarcacao = await db
    .select({
      id: processos.id,
      status: processos.status,
      servicoNome: servicos.nome,
      numeroProtocolo: processos.numeroProtocolo,
      criadoEm: processos.criadoEm,
    })
    .from(processos)
    .innerJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(and(eq(processos.embarcacaoId, id), isNull(processos.excluidoEm)))
    .orderBy(desc(processos.criadoEm));

  const documentosDaEmbarcacao = await db
    .select({
      id: documentosGerados.id,
      criadoEm: documentosGerados.criadoEm,
      modeloNome: modelosDocumento.nome,
      status: documentosGerados.status,
      vencimento: documentosGerados.vencimento,
    })
    .from(documentosGerados)
    .innerJoin(modelosDocumento, eq(documentosGerados.modeloId, modelosDocumento.id))
    .where(eq(documentosGerados.embarcacaoId, id))
    .orderBy(desc(documentosGerados.criadoEm));

  const orcamentosDaEmbarcacao = await db
    .select()
    .from(orcamentos)
    .where(and(eq(orcamentos.embarcacaoId, id), isNull(orcamentos.excluidoEm)))
    .orderBy(desc(orcamentos.criadoEm));

  const arquivosDaEmbarcacao = await db
    .select()
    .from(arquivos)
    .where(eq(arquivos.embarcacaoId, id))
    .orderBy(desc(arquivos.criadoEm));

  const adicionarItemComId = adicionarItemSalvatagem.bind(null, id);
  const excluirComId = excluirEmbarcacao.bind(null, id);
  const enviarFotoComId = enviarFotoEmbarcacao.bind(null, id);
  const removerFotoComId = removerFotoEmbarcacao.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/embarcacoes" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-headline-lg font-bold text-primary">{embarcacao.nome}</h1>
            <Badge tone={embarcacao.classe === "comercial" ? "warning" : "info"} size="sm">
              {embarcacao.classe === "comercial" ? "Comercial" : "Esporte e Recreio"}
            </Badge>
          </div>
          <p className="text-body-sm text-outline">
            Proprietário:{" "}
            <Link href={`/clientes/${proprietario.id}`} className="hover:underline">
              {proprietario.nome}
            </Link>
          </p>
          <CadastradoPor usuarioId={embarcacao.criadoPorId} />
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/embarcacoes/${id}/editar`} variant="outlined">
            Editar
          </LinkButton>
          <form action={excluirComId}>
            <ConfirmButton
              mensagem={`Excluir a embarcação ${embarcacao.nome}?`}
              icon={<Trash2 size={14} />}
            >
              Excluir
            </ConfirmButton>
          </form>
        </div>
      </div>

      <SectionCard title="Dados Técnicos">
        <dl className="grid grid-cols-2 gap-4 text-body-md sm:grid-cols-4">
          {[
            ["Tipo", embarcacao.tipo],
            ["Inscrição", embarcacao.numeroInscricao],
            ["Comprimento", embarcacao.comprimento],
            ["Boca", embarcacao.boca],
            ["Casco Nº", embarcacao.numeroCasco],
            ["Material Casco", embarcacao.materialCasco],
            ["Ano", embarcacao.ano],
            ["Lotação", embarcacao.lotacao],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="font-mono-caps text-label-sm uppercase text-outline">{label}</dt>
              <dd className="text-primary">{value ?? "—"}</dd>
            </div>
          ))}
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Validade DPEM</dt>
            <dd className="flex items-center gap-2 text-primary">
              {embarcacao.validadeDpem ?? "—"}
              {embarcacao.validadeDpem && (
                <StatusBadge status={infoUrgencia(urgenciaVencimento(embarcacao.validadeDpem))} size="sm" />
              )}
            </dd>
          </div>
          {embarcacao.classe === "comercial" && (
            <div>
              <dt className="font-mono-caps text-label-sm uppercase text-outline">Atividade Específica</dt>
              <dd className="text-primary">{embarcacao.atividadeComercial ?? "—"}</dd>
            </div>
          )}
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Marca do Motor</dt>
            <dd className="text-primary">{embarcacao.tipoPropulsao ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Potência (HP)</dt>
            <dd className="text-primary">{embarcacao.potenciaMotor ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Nº Série do Motor</dt>
            <dd className="text-primary">{embarcacao.numeroSerieMotor ?? "—"}</dd>
          </div>
        </dl>
      </SectionCard>

      {motoresDaEmbarcacao.length > 0 && (
        <SectionCard title="Motores">
          <table className="w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Marca</th>
                <th className="px-2 py-2">Potência</th>
                <th className="px-2 py-2">Nº Série</th>
              </tr>
            </thead>
            <tbody>
              {motoresDaEmbarcacao.map((m) => (
                <tr key={m.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-2 py-2">{m.ordem}</td>
                  <td className="px-2 py-2">{m.marca ?? "—"}</td>
                  <td className="px-2 py-2">{m.potencia ?? "—"}</td>
                  <td className="px-2 py-2">{m.numeroSerie ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {aquisicoesDaEmbarcacao.length > 0 && (
        <SectionCard title="Aquisição">
          {aquisicoesDaEmbarcacao.map((a) => (
            <dl key={a.id} className="grid grid-cols-2 gap-4 text-body-md sm:grid-cols-4">
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">NF</dt>
                <dd className="text-primary">{a.numeroNf ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">Data</dt>
                <dd className="text-primary">{a.dataVenda ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">Vendedor</dt>
                <dd className="text-primary">{a.vendedor ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">Valor</dt>
                <dd className="text-primary">{a.valor ?? "—"}</dd>
              </div>
            </dl>
          ))}
        </SectionCard>
      )}

      <SectionCard title="Controle de Salvatagem">
        {salvatagemDaEmbarcacao.length > 0 && (
          <table className="mb-4 w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                <th className="px-2 py-2">Item</th>
                <th className="px-2 py-2">Quantidade</th>
                <th className="px-2 py-2">Validade</th>
              </tr>
            </thead>
            <tbody>
              {salvatagemDaEmbarcacao.map((s) => (
                <tr key={s.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-2 py-2">{s.item}</td>
                  <td className="px-2 py-2">{s.quantidade}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      {s.validade ?? "—"}
                      {s.validade && (
                        <StatusBadge status={infoUrgencia(urgenciaVencimento(s.validade))} size="sm" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form action={adicionarItemComId} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Campo label="Item" name="item" required />
          <Campo label="Quantidade" name="quantidade" type="number" defaultValue={1} />
          <Campo label="Validade" name="validade" type="date" />
          <div className="flex items-end">
            <Button type="submit">Adicionar Item</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title={`Processos e Serviços (${processosDaEmbarcacao.length})`}>
        {processosDaEmbarcacao.length === 0 ? (
          <EmptyState icon={FileStack} title="Nenhum processo vinculado a esta embarcação ainda" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {processosDaEmbarcacao.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/processos/${p.id}`}
                  className="min-w-0 flex-1 truncate text-body-md text-primary hover:underline"
                >
                  {p.servicoNome}
                  {p.numeroProtocolo ? ` — protocolo ${p.numeroProtocolo}` : ""}
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-body-sm text-outline">
                    {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                  </span>
                  <StatusBadge status={statusProcesso(p.status)} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <LinkButton href={`/processos/novo?clienteId=${embarcacao.clienteId}`} variant="outlined" size="sm">
            + Novo Processo
          </LinkButton>
        </div>
      </SectionCard>

      <SectionCard title={`Documentos Gerados (${documentosDaEmbarcacao.length})`}>
        {documentosDaEmbarcacao.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum documento gerado para esta embarcação ainda" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {documentosDaEmbarcacao.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/documentos/${d.id}`}
                  className="min-w-0 flex-1 truncate text-body-md text-primary hover:underline"
                >
                  {d.modeloNome}
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-body-sm text-outline">
                    {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
                  </span>
                  <StatusBadge status={statusDocumento(d.status)} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={`Orçamentos e Financeiro (${orcamentosDaEmbarcacao.length})`}>
        {orcamentosDaEmbarcacao.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhum orçamento vinculado a esta embarcação ainda" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {orcamentosDaEmbarcacao.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/orcamentos/${o.id}`}
                  className="min-w-0 flex-1 truncate text-body-md text-primary hover:underline"
                >
                  {o.numero} — {formatMoney(o.valor)}
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-body-sm text-outline">
                    {o.criadoEm.toLocaleDateString("pt-BR")}
                  </span>
                  <StatusBadge status={statusOrcamento(o.status)} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={`Arquivos vinculados (${arquivosDaEmbarcacao.length})`}>
        {arquivosDaEmbarcacao.length === 0 ? (
          <EmptyState icon={FolderOpen} title="Nenhum arquivo vinculado a esta embarcação ainda" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {arquivosDaEmbarcacao.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-body-md text-primary">
                  <span className="font-mono-caps text-label-sm uppercase text-outline">{a.tipo}</span>{" "}
                  — {a.nomeOriginal}
                </span>
                <div className="flex shrink-0 gap-3">
                  <a
                    href={`/api/arquivos/${a.id}?inline=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-body-sm text-primary hover:underline"
                  >
                    Abrir
                  </a>
                  <a href={`/api/arquivos/${a.id}`} className="text-body-sm text-primary hover:underline">
                    Baixar
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={`Fotos da Embarcação (${fotosDaEmbarcacao.length})`}>
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fotosDaEmbarcacao.map((foto) => (
            <div key={foto.id} className="space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-outline-variant">
                <Image
                  src={`/api/embarcacao-fotos/${foto.id}`}
                  alt="Foto da embarcação"
                  fill
                  className="object-cover"
                />
              </div>
              <form action={removerFotoComId.bind(null, foto.id)}>
                <Button type="submit" variant="outlined" size="sm">
                  Remover
                </Button>
              </form>
            </div>
          ))}
        </div>
        <form action={enviarFotoComId} className="flex items-end gap-3">
          <input
            name="foto"
            type="file"
            accept="image/*"
            required
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
          />
          <Button type="submit" variant="outlined" size="sm">
            Enviar Foto
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
