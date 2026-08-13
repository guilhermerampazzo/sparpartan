import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, inArray, and, desc, isNull, asc, ilike } from "drizzle-orm";
import { FileText, Mail, CircleDollarSign, CalendarClock, Ship, Download, Trash2, Eye, Landmark, FileStack, Plus, Receipt, ClipboardList, ShoppingBag, GraduationCap } from "lucide-react";
import { db } from "@/db";
import {
  clientes,
  embarcacoes,
  habilitacoes,
  arquivos,
  documentosGerados,
  enviosEmail,
  pagamentos,
  servicosContratados,
  agendaEventos,
  modelosDocumento,
  obras,
  taxasPagar,
  processos,
  servicos,
  despesas,
  orcamentos,
  pendencias,
  lojaVendas,
  alunos,
  matriculas,
  materias,
} from "@/db/schema";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { Badge, StatusBadge, Button, LinkButton, EmptyState, BackButton, ConfirmButton, CampoMoeda } from "@/components/ui";
import { CadastradoPor } from "@/components/ui/cadastrado-por";
import { OcrArquivo } from "@/components/ocr/ocr-arquivo";
import { urgenciaVencimento, infoUrgencia, diasAte, vencimentoProtocolo, statusDocumento, statusOrcamento, tipoEvento, statusEvento } from "@/lib/status";
import {
  adicionarHabilitacao,
  enviarArquivo,
  definirSenhaPortal,
  gerarLinkCadastro,
  gerarLinkEmbarcacao,
  criarDespesaCliente,
  excluirDespesaCliente,
} from "./actions";
import { excluirCliente } from "../actions";
import { marcarTaxaComoPaga, excluirTaxa } from "../../taxas/actions";
import { infoStatusVenda } from "@/lib/loja";
import { AtendimentoCard } from "./atendimento-card";

type EventoTimeline = {
  data: Date;
  label: string;
  tipo: "documento" | "email" | "pagamento" | "evento";
};

const TIMELINE_ICON = {
  documento: FileText,
  email: Mail,
  pagamento: CircleDollarSign,
  evento: CalendarClock,
} as const;

function formatMoney(v: string | number) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ClienteDetalhesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ link?: string }>;
}) {
  const { id } = await params;
  const { link } = await searchParams;

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1);
  if (!cliente) notFound();

  const gerarLinkCadastroComId = gerarLinkCadastro.bind(null, id);
  const gerarLinkEmbarcacaoComId = gerarLinkEmbarcacao.bind(null, id);
  const excluirComId = excluirCliente.bind(null, id);

  const embarcacoesDoCliente = await db
    .select()
    .from(embarcacoes)
    .where(eq(embarcacoes.clienteId, id));

  const habilitacoesDoCliente = await db
    .select()
    .from(habilitacoes)
    .where(eq(habilitacoes.clienteId, id));

  const obrasDoCliente = await db
    .select()
    .from(obras)
    .where(eq(obras.clienteId, id));

  const embarcacoesEsporteRecreio = embarcacoesDoCliente.filter(
    (e) => e.classe !== "comercial"
  );
  const embarcacoesComerciais = embarcacoesDoCliente.filter((e) => e.classe === "comercial");
  const habilitacoesAmadoras = habilitacoesDoCliente.filter((h) => h.tipo === "CHA");
  const habilitacoesComerciaisCir = habilitacoesDoCliente.filter((h) => h.tipo === "CIR");

  const arquivosDoCliente = await db
    .select()
    .from(arquivos)
    .where(eq(arquivos.clienteId, id));

  const adicionarHabilitacaoComId = adicionarHabilitacao.bind(null, id);
  const enviarArquivoComId = enviarArquivo.bind(null, id);
  const definirSenhaPortalComId = definirSenhaPortal.bind(null, id);

  const documentosDoCliente = await db
    .select({
      id: documentosGerados.id,
      criadoEm: documentosGerados.criadoEm,
      modeloNome: modelosDocumento.nome,
      status: documentosGerados.status,
      vencimento: documentosGerados.vencimento,
    })
    .from(documentosGerados)
    .innerJoin(modelosDocumento, eq(documentosGerados.modeloId, modelosDocumento.id))
    .where(eq(documentosGerados.clienteId, id))
    .orderBy(desc(documentosGerados.criadoEm));

  const emailsDoCliente = await db
    .select()
    .from(enviosEmail)
    .where(eq(enviosEmail.clienteId, id));

  const vendasDoCliente = await db
    .select({
      id: servicosContratados.id,
      servicoNome: servicos.nome,
      valor: servicosContratados.valor,
      dataContratacao: servicosContratados.dataContratacao,
      orcamentoId: servicosContratados.orcamentoId,
    })
    .from(servicosContratados)
    .innerJoin(servicos, eq(servicosContratados.servicoId, servicos.id))
    .where(eq(servicosContratados.clienteId, id))
    .orderBy(desc(servicosContratados.dataContratacao));

  const pagamentosDoCliente =
    vendasDoCliente.length > 0
      ? await db
          .select()
          .from(pagamentos)
          .where(
            inArray(
              pagamentos.servicoContratadoId,
              vendasDoCliente.map((v) => v.id)
            )
          )
      : [];

  const saldoPorVenda = new Map<string, number>();
  for (const pag of pagamentosDoCliente) {
    if (pag.status === "pago") continue;
    saldoPorVenda.set(
      pag.servicoContratadoId,
      (saldoPorVenda.get(pag.servicoContratadoId) ?? 0) + Number(pag.valor)
    );
  }

  const eventosDoCliente = await db
    .select()
    .from(agendaEventos)
    .where(eq(agendaEventos.clienteId, id));

  const taxasDoCliente = await db
    .select()
    .from(taxasPagar)
    .where(eq(taxasPagar.clienteId, id));

  const orcamentosDoCliente = await db
    .select()
    .from(orcamentos)
    .where(and(eq(orcamentos.clienteId, id), isNull(orcamentos.excluidoEm)))
    .orderBy(desc(orcamentos.criadoEm));

  const pendenciasDoCliente = await db
    .select()
    .from(pendencias)
    .where(and(eq(pendencias.clienteId, id), eq(pendencias.status, "pendente")))
    .orderBy(asc(pendencias.data));

  const vendasLojaDoCliente = await db
    .select()
    .from(lojaVendas)
    .where(eq(lojaVendas.clienteId, id))
    .orderBy(desc(lojaVendas.criadoEm));

  // A escola tem cadastro próprio (alunos), sem FK para clientes — a ponte é o
  // e-mail. Quando bater, mostramos os cursos/matrículas deste cliente.
  const [alunoDoCliente] = cliente.email
    ? await db.select().from(alunos).where(ilike(alunos.email, cliente.email)).limit(1)
    : [];
  const matriculasDoAluno = alunoDoCliente
    ? await db
        .select({
          materiaTitulo: materias.titulo,
          status: matriculas.status,
          liberadoEm: matriculas.liberadoEm,
          expiraEm: matriculas.expiraEm,
        })
        .from(matriculas)
        .innerJoin(materias, eq(matriculas.materiaId, materias.id))
        .where(eq(matriculas.alunoId, alunoDoCliente.id))
        .orderBy(desc(matriculas.liberadoEm))
    : [];

  const atendimentos = await db
    .select({
      id: processos.id,
      status: processos.status,
      servicoNome: servicos.nome,
      embarcacaoNome: embarcacoes.nome,
      numeroProtocolo: processos.numeroProtocolo,
      dataProtocolo: processos.dataProtocolo,
      exigenciaObservacao: processos.exigenciaObservacao,
      criadoEm: processos.criadoEm,
    })
    .from(processos)
    .innerJoin(servicos, eq(processos.servicoId, servicos.id))
    .leftJoin(embarcacoes, eq(processos.embarcacaoId, embarcacoes.id))
    .where(and(eq(processos.clienteId, id), isNull(processos.excluidoEm)))
    .orderBy(desc(processos.criadoEm));

  const atendimentosComPrazo = atendimentos.map((p) => ({
    ...p,
    diasProtocolo: p.dataProtocolo ? Math.max(0, diasAte(vencimentoProtocolo(p.dataProtocolo))) : null,
  }));

  const pagamentosPagosDoCliente = pagamentosDoCliente.filter((p) => p.status === "pago");
  const taxasPagasDoCliente = taxasDoCliente.filter((t) => t.status === "pago");
  const despesasDoCliente = await db
    .select()
    .from(despesas)
    .where(eq(despesas.clienteId, id))
    .orderBy(desc(despesas.data));

  const totalEntradas = pagamentosPagosDoCliente.reduce((acc, p) => acc + Number(p.valor), 0);
  const totalSaidas =
    taxasPagasDoCliente.reduce((acc, t) => acc + Number(t.valor), 0) +
    despesasDoCliente.reduce((acc, d) => acc + Number(d.valor), 0);

  const timeline: EventoTimeline[] = [
    ...documentosDoCliente.map((d) => ({
      data: d.criadoEm,
      label: `Documento gerado: ${d.modeloNome}`,
      tipo: "documento" as const,
    })),
    ...emailsDoCliente.map((e) => ({
      data: e.criadoEm,
      label: `E-mail enviado: ${e.assunto}`,
      tipo: "email" as const,
    })),
    ...pagamentosDoCliente.map((p) => ({
      data: p.criadoEm,
      label: `Pagamento registrado: R$ ${Number(p.valor).toLocaleString("pt-BR")}`,
      tipo: "pagamento" as const,
    })),
    ...eventosDoCliente.map((ev) => ({
      data: ev.dataHora,
      label: `Evento: ${ev.titulo}`,
      tipo: "evento" as const,
    })),
    ...atendimentos.map((p) => ({
      data: p.criadoEm,
      label: `Atendimento iniciado: ${p.servicoNome}`,
      tipo: "evento" as const,
    })),
    ...arquivosDoCliente.map((a) => ({
      data: a.criadoEm,
      label: `Arquivo enviado: ${a.nomeOriginal}`,
      tipo: "documento" as const,
    })),
    ...orcamentosDoCliente.map((o) => ({
      data: o.criadoEm,
      label: `Orçamento ${o.numero} criado (${o.status})`,
      tipo: "documento" as const,
    })),
    ...taxasDoCliente
      .filter((t) => t.status === "pago" && t.pagoEm)
      .map((t) => ({
        data: t.pagoEm!,
        label: `Taxa paga: ${t.descricao}${t.numero ? ` (GRU ${t.numero})` : ""} — R$ ${Number(t.valor).toLocaleString("pt-BR")}`,
        tipo: "pagamento" as const,
      })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  return (
    <div className="space-y-gutter">
      <BackButton href="/clientes" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">{cliente.nome}</h1>
          <p className="text-body-sm text-outline">{cliente.cpfCnpj}</p>
          {(() => {
            const contatos = [
              cliente.celular ?? cliente.telefone,
              cliente.email,
              [cliente.cidade, cliente.uf].filter(Boolean).join(" - "),
            ].filter((c): c is string => !!c);
            return contatos.length > 0 ? (
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-body-sm text-on-surface-variant">
                {contatos.map((c, i) => (
                  <span key={i}>{c}</span>
                ))}
              </p>
            ) : null;
          })()}
          <CadastradoPor usuarioId={cliente.criadoPorId} />
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/clientes/${cliente.id}/editar`} variant="outlined">
            Editar
          </LinkButton>
          <LinkButton href={`/api/etiqueta/${cliente.id}`} variant="outlined" icon={Download}>
            Etiqueta de Envio
          </LinkButton>
          <form action={excluirComId}>
            <ConfirmButton
              mensagem={`Excluir ${cliente.nome}? Vai para a lixeira, dá para restaurar depois.`}
              icon={<Trash2 size={14} />}
            >
              Excluir
            </ConfirmButton>
          </form>
        </div>
      </div>

      <SectionCard title="Processos/Serviços deste cliente">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-sm text-outline">
            Cada serviço abre o processo diretamente — acompanhe status, documentos, pagamento e protocolo.
          </p>
        </div>
        {atendimentos.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title="Nenhum processo para este cliente ainda"
            description="Os processos são criados automaticamente ao cadastrar um cliente com serviço (Novo Cliente)."
          />
        ) : (
          <div className="space-y-3">
            {atendimentosComPrazo.map((p) => (
              <AtendimentoCard key={p.id} processo={p} />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Links de autoatendimento">
        <p className="mb-4 text-body-sm text-outline">
          Gere um link para o cliente preencher os próprios dados ou cadastrar uma embarcação, sem
          precisar de login.
        </p>
        {link && (
          <div className="mb-4 rounded-lg bg-info-container p-3 text-body-sm text-on-info-container">
            Link gerado: <span className="break-all font-mono">{`${process.env.AUTH_URL || "http://localhost:8080"}/c/${link}`}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <form action={gerarLinkCadastroComId}>
            <Button type="submit" variant="outlined" size="sm">
              Gerar link de cadastro
            </Button>
          </form>
          <form action={gerarLinkEmbarcacaoComId}>
            <Button type="submit" variant="outlined" size="sm">
              Gerar link para cadastrar embarcação
            </Button>
          </form>
        </div>
      </SectionCard>

      <SectionCard title={`Documentos Gerados (${documentosDoCliente.length})`}>
        {documentosDoCliente.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum documento gerado ainda" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {documentosDoCliente.map((d) => (
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
                    {d.vencimento ? ` · vence ${new Date(`${d.vencimento}T00:00:00`).toLocaleDateString("pt-BR")}` : ""}
                  </span>
                  <StatusBadge status={statusDocumento(d.status)} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={`Orçamentos (${orcamentosDoCliente.length})`}>
        {orcamentosDoCliente.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhum orçamento para este cliente ainda" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {orcamentosDoCliente.map((o) => (
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

      <SectionCard title="Timeline">
        {timeline.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhuma atividade registrada ainda" />
        ) : (
          <ul className="space-y-4">
            {timeline.map((ev, i) => {
              const Icon = TIMELINE_ICON[ev.tipo];
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-pill bg-surface-container p-1.5 text-outline">
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md text-primary">{ev.label}</p>
                    <p className="font-mono-caps text-label-sm uppercase text-outline">
                      {new Date(ev.data).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Dados de Contato">
        <dl className="grid grid-cols-1 gap-4 text-body-md sm:grid-cols-3">
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">E-mail</dt>
            <dd className="text-primary">{cliente.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Telefone</dt>
            <dd className="text-primary">{cliente.telefone ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Celular</dt>
            <dd className="text-primary">{cliente.celular ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Cidade/UF</dt>
            <dd className="text-primary">
              {cliente.cidade ?? "—"}
              {cliente.uf ? `/${cliente.uf}` : ""}
            </dd>
          </div>
        </dl>
      </SectionCard>

      {embarcacoesDoCliente.length > 0 && (
        <SectionCard title="Senha DPEM">
          <p className="text-body-sm text-outline">
            A mesma senha vale para todas as embarcações deste cliente.
          </p>
          {cliente.senhaDpem ? (
            <p className="mt-2 font-mono text-body-md font-semibold text-primary">{cliente.senhaDpem}</p>
          ) : (
            <p className="mt-2 text-body-sm font-medium text-warning">
              Nenhuma senha DPEM cadastrada — informe em Editar cliente.
            </p>
          )}
        </SectionCard>
      )}

      <SectionCard title="Embarcações Esporte e Recreio">
        {embarcacoesEsporteRecreio.length === 0 ? (
          <EmptyState icon={Ship} title="Nenhuma embarcação esporte e recreio vinculada" />
        ) : (
          <ul className="space-y-2">
            {embarcacoesEsporteRecreio.map((e) => (
              <li key={e.id}>
                <Link href={`/embarcacoes/${e.id}`} className="inline-flex items-center gap-2 text-body-md text-primary hover:underline">
                  <Ship size={14} /> {e.nome} {e.numeroInscricao ? `— ${e.numeroInscricao}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Embarcações Comerciais">
        {embarcacoesComerciais.length === 0 ? (
          <EmptyState icon={Ship} title="Nenhuma embarcação comercial vinculada" />
        ) : (
          <ul className="space-y-2">
            {embarcacoesComerciais.map((e) => (
              <li key={e.id}>
                <Link href={`/embarcacoes/${e.id}`} className="inline-flex items-center gap-2 text-body-md text-primary hover:underline">
                  <Ship size={14} /> {e.nome} {e.numeroInscricao ? `— ${e.numeroInscricao}` : ""}
                  {e.atividadeComercial ? ` — ${e.atividadeComercial}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Obras">
        {obrasDoCliente.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhuma obra vinculada" />
        ) : (
          <ul className="space-y-2">
            {obrasDoCliente.map((o) => (
              <li key={o.id}>
                <Link href={`/obras/${o.id}`} className="inline-flex items-center gap-2 text-body-md text-primary hover:underline">
                  <FileText size={14} /> {o.titulo ?? "(sem título)"} {o.idObra ? `— ${o.idObra}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Taxas e GRU">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-body-sm text-outline">
            Boletos/taxas de órgãos vinculadas a este cliente — controle o pagamento direto aqui.
          </p>
          <LinkButton href="/taxas/novo" variant="outlined" size="sm">
            + Nova Taxa
          </LinkButton>
        </div>
        {taxasDoCliente.length === 0 ? (
          <EmptyState icon={Landmark} title="Nenhuma taxa vinculada a este cliente ainda" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-md">
              <thead>
                <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                  <th className="px-2 py-2">Nº GRU/Guia</th>
                  <th className="px-2 py-2">Descrição</th>
                  <th className="px-2 py-2">Valor</th>
                  <th className="px-2 py-2">Vencimento</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Boleto</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {taxasDoCliente.map((t) => (
                  <tr key={t.id} className="border-b border-outline-variant last:border-0">
                    <td className="px-2 py-2 font-medium text-primary">{t.numero ?? "—"}</td>
                    <td className="px-2 py-2">{t.descricao}</td>
                    <td className="px-2 py-2">{formatMoney(t.valor)}</td>
                    <td className="px-2 py-2">{t.vencimento ?? "—"}</td>
                    <td className="px-2 py-2">
                      {t.status === "pago" ? (
                        <Badge tone="success" size="sm">Paga</Badge>
                      ) : (
                        <Badge tone="warning" size="sm">Pendente</Badge>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {t.arquivoCaminho ? (
                        <div className="flex items-center gap-3">
                          <a
                            href={`/api/taxas/${t.id}?inline=1`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
                          >
                            <Eye size={12} /> Abrir
                          </a>
                          <a
                            href={`/api/taxas/${t.id}`}
                            className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
                          >
                            <Download size={12} /> Baixar
                          </a>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-2">
                        {t.status === "pendente" && (
                          <form action={marcarTaxaComoPaga.bind(null, t.id)}>
                            <input type="hidden" name="formaPagamento" value="" />
                            <Button type="submit" variant="outlined" size="sm">
                              Marcar Paga
                            </Button>
                          </form>
                        )}
                        <form action={excluirTaxa.bind(null, t.id)}>
                          <ConfirmButton
                            mensagem={`Excluir a taxa "${t.descricao}"? O arquivo também será removido.`}
                            variant="text"
                            icon={<Trash2 size={12} />}
                          >
                            Excluir
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title={`Vendas e Serviços Contratados (${vendasDoCliente.length})`}>
        {vendasDoCliente.length === 0 ? (
          <EmptyState icon={CircleDollarSign} title="Nenhuma venda registrada ainda" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {vendasDoCliente.map((v) => {
              const saldo = saldoPorVenda.get(v.id) ?? 0;
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-body-md text-primary">{v.servicoNome}</span>
                  <div className="flex items-center gap-3 text-body-sm">
                    <span className="text-outline">
                      {new Date(`${v.dataContratacao}T00:00:00`).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="font-medium">{formatMoney(v.valor)}</span>
                    {saldo > 0 ? (
                      <Badge tone="warning" size="sm">a receber {formatMoney(saldo)}</Badge>
                    ) : (
                      <Badge tone="success" size="sm">pago</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Financeiro do Cliente">
        <p className="mb-4 text-body-sm text-outline">
          Entradas (pagamentos recebidos) e saídas (taxas pagas + gastos extras) deste cliente —
          tudo entra automaticamente no Financeiro geral.
        </p>
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-outline-variant p-4">
            <p className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">Entradas</p>
            <p className="font-display text-title-lg font-bold text-success">{formatMoney(totalEntradas)}</p>
          </div>
          <div className="rounded-lg border border-outline-variant p-4">
            <p className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">Saídas</p>
            <p className="font-display text-title-lg font-bold text-danger">{formatMoney(totalSaidas)}</p>
          </div>
          <div className="rounded-lg border border-outline-variant p-4">
            <p className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">Saldo</p>
            <p className="font-display text-title-lg font-bold text-primary">{formatMoney(totalEntradas - totalSaidas)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">Entradas</p>
            {pagamentosPagosDoCliente.length === 0 ? (
              <p className="text-body-sm text-outline">Nenhum pagamento recebido ainda.</p>
            ) : (
              <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
                {pagamentosPagosDoCliente.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-3 py-2 text-body-sm">
                    <span className="text-primary">{formatMoney(p.valor)}</span>
                    <span className="text-outline">
                      {p.dataPagamento
                        ? new Date(`${p.dataPagamento}T00:00:00`).toLocaleDateString("pt-BR")
                        : new Date(p.criadoEm).toLocaleDateString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="pt-4 font-mono-caps text-label-sm uppercase tracking-wide text-outline">Saídas</p>
            {taxasPagasDoCliente.length === 0 && despesasDoCliente.length === 0 ? (
              <p className="text-body-sm text-outline">Nenhuma saída registrada ainda.</p>
            ) : (
              <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
                {taxasPagasDoCliente.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-3 py-2 text-body-sm">
                    <span className="text-primary">Taxa: {t.descricao}</span>
                    <span className="text-outline">-{formatMoney(t.valor)}</span>
                  </li>
                ))}
                {despesasDoCliente.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-body-sm">
                    <span className="min-w-0 flex-1 truncate text-primary">
                      {d.descricao}
                      <span className="text-outline">
                        {" "}
                        — {new Date(`${d.data}T00:00:00`).toLocaleDateString("pt-BR")}
                      </span>
                    </span>
                    <span className="text-outline">-{formatMoney(d.valor)}</span>
                    <form action={excluirDespesaCliente.bind(null, d.id)}>
                      <ConfirmButton
                        mensagem={`Excluir o gasto "${d.descricao}"?`}
                        variant="text"
                        icon={<Trash2 size={12} />}
                      >
                        Excluir
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">
              Registrar gasto extra
            </p>
            <form action={criarDespesaCliente.bind(null, cliente.id)} className="mt-2 space-y-3">
              <label className="flex flex-col gap-1">
                <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Descrição *</span>
                <input
                  name="descricao"
                  required
                  placeholder="Ex.: Correio (envio de documento), terceirizado..."
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <CampoMoeda label="Valor" name="valor" required />
                <label className="flex flex-col gap-1">
                  <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Data</span>
                  <input
                    name="data"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                  />
                </label>
              </div>
              <Button type="submit" variant="outlined" size="sm" icon={Plus}>
                Adicionar Gasto
              </Button>
            </form>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Pendências (${pendenciasDoCliente.length} abertas)`}>
        {pendenciasDoCliente.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nenhuma pendência aberta para este cliente" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {pendenciasDoCliente.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md text-primary">{p.descricao}</p>
                  <p className="text-body-sm text-outline">
                    {p.categoria} · prioridade {p.prioridade}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-body-sm text-outline">
                    {new Date(`${p.data}T00:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                  <Link
                    href="/pendencias"
                    className="text-body-sm text-primary hover:underline"
                  >
                    Resolver
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Agenda">
        {eventosDoCliente.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nenhum evento agendado para este cliente" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {eventosDoCliente.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-body-md text-primary">{ev.titulo}</span>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-body-sm text-outline">
                    {new Date(ev.dataHora).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Badge tone={tipoEvento(ev.tipo).tone} size="sm">{tipoEvento(ev.tipo).label}</Badge>
                  <StatusBadge status={statusEvento(ev.status)} size="sm" />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <LinkButton href={`/agenda/novo?clienteId=${cliente.id}`} variant="outlined" size="sm">
            + Novo Evento
          </LinkButton>
        </div>
      </SectionCard>

      <SectionCard title={`Compras na Loja (${vendasLojaDoCliente.length})`}>
        {vendasLojaDoCliente.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Nenhuma compra na loja ainda" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {vendasLojaDoCliente.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/loja/vendas/${v.id}`}
                  className="min-w-0 flex-1 truncate text-body-md text-primary hover:underline"
                >
                  Venda de {formatMoney(v.valorTotal)}
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-body-sm text-outline">
                    {v.criadoEm.toLocaleDateString("pt-BR")}
                  </span>
                  <Badge tone={infoStatusVenda(v.status).tone} size="sm">
                    {infoStatusVenda(v.status).label}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Cursos na Escola Náutica">
        {!alunoDoCliente || matriculasDoAluno.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nenhum curso vinculado"
            description={cliente.email ? "Se o aluno usar o mesmo e-mail do cliente, os cursos aparecem aqui automaticamente." : "Cadastre um e-mail para o cliente para vincular a conta de aluno."}
          />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {matriculasDoAluno.map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="text-body-md text-primary">{m.materiaTitulo}</span>
                <div className="flex items-center gap-3 text-body-sm">
                  <span className="text-outline">
                    liberado em {m.liberadoEm.toLocaleDateString("pt-BR")}
                  </span>
                  <Badge
                    tone={m.status === "ativo" ? "success" : m.status === "expirado" ? "warning" : "danger"}
                    size="sm"
                  >
                    {m.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Habilitação Amadora">
        {habilitacoesAmadoras.length > 0 && (
          <table className="mb-4 w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Número</th>
                <th className="px-2 py-2">Categoria</th>
                <th className="px-2 py-2">Validade</th>
              </tr>
            </thead>
            <tbody>
              {habilitacoesAmadoras.map((h) => (
                <tr key={h.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-2 py-2">
                    <Badge tone="info" size="sm">{h.tipo}</Badge>
                  </td>
                  <td className="px-2 py-2">{h.numero ?? "—"}</td>
                  <td className="px-2 py-2">{h.categoria ?? "—"}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      {h.validade ?? "—"}
                      {h.validade && <StatusBadge status={infoUrgencia(urgenciaVencimento(h.validade))} size="sm" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form action={adicionarHabilitacaoComId} className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <input type="hidden" name="tipo" value="CHA" />
          <Campo label="Número" name="numero" />
          <Campo label="Categoria" name="categoria" />
          <Campo label="Data de Emissão" name="dataEmissao" type="date" />
          <Campo label="Validade" name="validade" type="date" />
          <div className="sm:col-span-5">
            <Button type="submit">Adicionar Habilitação Amadora</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Habilitação comercial-CIR">
        {habilitacoesComerciaisCir.length > 0 && (
          <table className="mb-4 w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                <th className="px-2 py-2">Tipo</th>
                <th className="px-2 py-2">Número</th>
                <th className="px-2 py-2">Categoria</th>
                <th className="px-2 py-2">Validade</th>
              </tr>
            </thead>
            <tbody>
              {habilitacoesComerciaisCir.map((h) => (
                <tr key={h.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-2 py-2">
                    <Badge tone="info" size="sm">{h.tipo}</Badge>
                  </td>
                  <td className="px-2 py-2">{h.numero ?? "—"}</td>
                  <td className="px-2 py-2">{h.categoria ?? "—"}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      {h.validade ?? "—"}
                      {h.validade && <StatusBadge status={infoUrgencia(urgenciaVencimento(h.validade))} size="sm" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form action={adicionarHabilitacaoComId} className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <input type="hidden" name="tipo" value="CIR" />
          <Campo label="Número" name="numero" />
          <Campo label="Categoria" name="categoria" />
          <Campo label="Data de Emissão" name="dataEmissao" type="date" />
          <Campo label="Validade" name="validade" type="date" />
          <div className="sm:col-span-5">
            <Button type="submit">Adicionar Habilitação CIR</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Arquivos">
        {arquivosDoCliente.length > 0 && (
          <ul className="mb-4 space-y-2 text-body-md">
            {arquivosDoCliente.map((a) => {
              const embarcacaoDoArquivo = embarcacoesDoCliente.find((e) => e.id === a.embarcacaoId);
              return (
                <li key={a.id} className="flex items-center justify-between">
                  <span>
                    <span className="font-mono-caps text-label-sm uppercase text-outline">
                      {a.tipo}
                    </span>{" "}
                    — {a.nomeOriginal}
                    {embarcacaoDoArquivo && (
                      <span className="ml-2 text-body-sm text-outline">
                        (embarcação: {embarcacaoDoArquivo.nome})
                      </span>
                    )}
                  </span>
                  <span className="flex gap-3">
                    <a
                      href={`/api/arquivos/${a.id}?inline=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-body-sm text-primary hover:underline"
                    >
                      Abrir
                    </a>
                    <a
                      href={`/api/arquivos/${a.id}`}
                      className="text-body-sm text-primary hover:underline"
                    >
                      Baixar
                    </a>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <form action={enviarArquivoComId} className="grid grid-cols-1 gap-4 sm:grid-cols-5">
          <CampoSelect
            label="Tipo"
            name="tipo"
            required
            options={[
              { value: "RG", label: "RG" },
              { value: "CPF", label: "CPF" },
              { value: "CRLV", label: "CRLV" },
              { value: "outro", label: "Outro" },
            ]}
          />
          <CampoSelect
            label="Embarcação (opcional)"
            name="embarcacaoId"
            options={[
              { value: "", label: "Nenhuma (documento do cliente)" },
              ...embarcacoesDoCliente.map((e) => ({ value: e.id, label: e.nome })),
            ]}
          />
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">
              Arquivo (foto ou PDF)
            </span>
            <input
              name="arquivo"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
              required
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
            />
          </label>
          <div className="flex items-end">
            <Button type="submit">Enviar Arquivo</Button>
          </div>
          <textarea name="textoExtraido" className="hidden" readOnly />
          <div className="sm:col-span-5">
            <OcrArquivo />
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Acesso ao Portal do Cliente">
        <p className="mb-4 text-body-sm text-outline">
          {cliente.portalSenhaHash
            ? "Este cliente já tem acesso ao portal. Definir uma nova senha substitui a atual."
            : "Este cliente ainda não tem acesso ao portal."}
        </p>
        <form action={definirSenhaPortalComId} className="flex items-end gap-4">
          <div className="w-64">
            <Campo label="Nova Senha do Portal" name="senha" type="password" required />
          </div>
          <Button type="submit">Definir Senha</Button>
        </form>
      </SectionCard>
    </div>
  );
}
