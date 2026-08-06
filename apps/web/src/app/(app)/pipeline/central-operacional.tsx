import Link from "next/link";
import {
  and,
  count,
  eq,
  gte,
  lte,
  ne,
  isNotNull,
  isNull,
  lt,
  inArray,
} from "drizzle-orm";
import {
  Users,
  FileStack,
  HardHat,
  Wallet,
  FileText,
  GraduationCap,
  Store,
  AlarmClock,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/db";
import {
  pipelineOportunidades,
  processos,
  orcamentos,
  taxasPagar,
  pagamentos,
  servicosContratados,
  documentosGerados,
  pendencias,
  agendaEventos,
  obras,
  despesas,
  alunos,
  matriculas,
  tentativasProva,
  lojaOrcamentos,
  lojaVendas,
  lojaEntregas,
} from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { TONE_ACCENT, TONE_BORDER, type Tone } from "@/components/ui/tone";

type Indicador = {
  rotulo: string;
  valor: number;
  href: string;
  tone: Tone;
};

type Grupo = {
  titulo: string;
  icone: LucideIcon;
  indicadores: Indicador[];
};

function CardIndicador({ rotulo, valor, href, tone }: Indicador) {
  return (
    <Link
      href={href}
      className={`flex flex-col gap-1 rounded-xl border ${TONE_BORDER[tone]} bg-surface-container-lowest p-4 shadow-card transition-shadow hover:shadow-card-hover`}
    >
      <span className={`font-display text-headline-md font-bold ${TONE_ACCENT[tone]}`}>{valor}</span>
      <span className="text-body-sm text-on-surface-variant">{rotulo}</span>
    </Link>
  );
}

function GrupoCards({ grupo }: { grupo: Grupo }) {
  const Icon = grupo.icone;
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <Icon size={16} /> {grupo.titulo}
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {grupo.indicadores.map((i) => (
          <CardIndicador key={i.rotulo} {...i} />
        ))}
      </div>
    </SectionCard>
  );
}

export async function CentralOperacional({ responsavelId }: { responsavelId?: string }) {
  const resp = responsavelId && /^[0-9a-f-]{36}$/i.test(responsavelId) ? responsavelId : undefined;
  const respOportunidade = resp ? eq(pipelineOportunidades.responsavelId, resp) : undefined;
  const respProcesso = resp ? eq(processos.responsavelId, resp) : undefined;
  const respOrcamento = resp ? eq(orcamentos.vendedorId, resp) : undefined;
  const respTaxa = resp ? eq(taxasPagar.criadoPorId, resp) : undefined;
  const respPendencia = resp ? eq(pendencias.responsavelId, resp) : undefined;
  const respObra = resp ? eq(obras.criadoPorId, resp) : undefined;
  const respDespesa = resp ? eq(despesas.criadoPorId, resp) : undefined;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().slice(0, 10);
  const semanaStr = new Date(hoje.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const inicioMes = hojeStr.slice(0, 8) + "01";

  const p = (cond?: Parameters<typeof and>[0]) => (cond ? and(cond) : undefined);

  const [
    leadsNovos,
    clientesAguardando,
    orcamentosAguardando,
    negociacoes,
    aguardandoPagamento,
    servicosContratadosP,
    processosAbertos,
    processosDocs,
    processosProntos,
    processosProtocolados,
    processosConcluidos,
    obrasCount,
    obrasSemDocumento,
    agendamentosFuturos,
    taxasPendentes,
    pagamentosAtrasados,
    recebimentosPrevistos,
    despesasMes,
    docsParaGerar,
    docsGerados,
    docsProtocolados,
    alunosAtivos,
    matriculasAtivas,
    provasAgendadas,
    aguardandoCorrecao,
    lojaOrcamentosPendentes,
    lojaVendasAndamento,
    lojaEntregasPendentes,
    pendHoje,
    pendAtrasadas,
    pendSemana,
  ] = await Promise.all([
    db.select({ n: count() }).from(pipelineOportunidades).where(p(and(eq(pipelineOportunidades.estagio, "novo_lead"), respOportunidade))),
    db.select({ n: count() }).from(pipelineOportunidades).where(p(and(inArray(pipelineOportunidades.estagio, ["primeiro_contato", "aguardando_documentacao", "negociacao"] as const), respOportunidade))),
    db.select({ n: count() }).from(orcamentos).where(p(and(eq(orcamentos.status, "pendente"), isNull(orcamentos.excluidoEm), respOrcamento))),
    db.select({ n: count() }).from(pipelineOportunidades).where(p(and(eq(pipelineOportunidades.estagio, "negociacao"), respOportunidade))),
    db.select({ n: count() }).from(pipelineOportunidades).where(p(and(eq(pipelineOportunidades.estagio, "aguardando_pagamento"), respOportunidade))),
    db.select({ n: count() }).from(pipelineOportunidades).where(p(and(eq(pipelineOportunidades.estagio, "servico_contratado"), respOportunidade))),
    db.select({ n: count() }).from(processos).where(p(and(eq(processos.status, "aberto"), isNull(processos.excluidoEm), respProcesso))),
    db.select({ n: count() }).from(processos).where(p(and(eq(processos.status, "documentos_pendentes"), isNull(processos.excluidoEm), respProcesso))),
    db.select({ n: count() }).from(processos).where(p(and(eq(processos.status, "pronto_para_protocolo"), isNull(processos.excluidoEm), respProcesso))),
    db.select({ n: count() }).from(processos).where(p(and(eq(processos.status, "protocolado"), isNull(processos.excluidoEm), respProcesso))),
    db.select({ n: count() }).from(processos).where(p(and(eq(processos.status, "concluido"), isNull(processos.excluidoEm), respProcesso))),
    db.select({ n: count() }).from(obras).where(p(and(isNull(obras.excluidoEm), respObra))),
    db
      .select({ n: count() })
      .from(obras)
      .leftJoin(documentosGerados, eq(documentosGerados.obraId, obras.id))
      .where(p(and(isNull(obras.excluidoEm), isNull(documentosGerados.id), respObra))),
    db.select({ n: count() }).from(agendaEventos).where(and(gte(agendaEventos.dataHora, hoje), ne(agendaEventos.status, "cancelado"))),
    db.select({ n: count() }).from(taxasPagar).where(p(and(eq(taxasPagar.status, "pendente"), respTaxa))),
    db
      .select({ n: count() })
      .from(pagamentos)
      .innerJoin(servicosContratados, eq(pagamentos.servicoContratadoId, servicosContratados.id))
      .where(p(and(eq(pagamentos.status, "atrasado"), resp ? eq(servicosContratados.vendedorId, resp) : undefined))),
    db
      .select({ n: count() })
      .from(pagamentos)
      .innerJoin(servicosContratados, eq(pagamentos.servicoContratadoId, servicosContratados.id))
      .where(p(and(eq(pagamentos.status, "pendente"), resp ? eq(servicosContratados.vendedorId, resp) : undefined))),
    db.select({ n: count() }).from(despesas).where(p(and(gte(despesas.data, inicioMes), respDespesa))),
    db.select({ n: count() }).from(processos).where(p(and(eq(processos.status, "documentos_pendentes"), isNull(processos.excluidoEm), respProcesso))),
    db.select({ n: count() }).from(documentosGerados).where(eq(documentosGerados.status, "gerado")),
    db.select({ n: count() }).from(documentosGerados).where(eq(documentosGerados.status, "protocolado")),
    db.select({ n: count() }).from(alunos).where(eq(alunos.ativo, true)),
    db.select({ n: count() }).from(matriculas).where(eq(matriculas.status, "ativo")),
    db.select({ n: count() }).from(agendaEventos).where(and(eq(agendaEventos.tipo, "prova"), gte(agendaEventos.dataHora, hoje), ne(agendaEventos.status, "cancelado"))),
    db.select({ n: count() }).from(tentativasProva).where(eq(tentativasProva.status, "aguardando_correcao")),
    db.select({ n: count() }).from(lojaOrcamentos).where(eq(lojaOrcamentos.status, "pendente")),
    db.select({ n: count() }).from(lojaVendas).where(eq(lojaVendas.status, "em_andamento")),
    db.select({ n: count() }).from(lojaEntregas).where(eq(lojaEntregas.status, "pendente")),
    db.select({ n: count() }).from(pendencias).where(p(and(eq(pendencias.status, "pendente"), eq(pendencias.data, hojeStr), respPendencia))),
    db.select({ n: count() }).from(pendencias).where(p(and(eq(pendencias.status, "pendente"), lt(pendencias.data, hojeStr), respPendencia))),
    db.select({ n: count() }).from(pendencias).where(p(and(eq(pendencias.status, "pendente"), gte(pendencias.data, hojeStr), lte(pendencias.data, semanaStr), respPendencia))),
  ]);

  const n = (r: { n: number }[]) => r[0]?.n ?? 0;

  const grupos: Grupo[] = [
    {
      titulo: "Comercial",
      icone: Users,
      indicadores: [
        { rotulo: "Leads aguardando atendimento", valor: n(leadsNovos), href: "/pipeline?aba=comercial&estagio=novo_lead", tone: "info" },
        { rotulo: "Clientes aguardando retorno", valor: n(clientesAguardando), href: "/pipeline?aba=comercial", tone: "warning" },
        { rotulo: "Orçamentos aguardando aprovação", valor: n(orcamentosAguardando), href: "/orcamentos?status=pendente", tone: "warning" },
        { rotulo: "Negociações em andamento", valor: n(negociacoes), href: "/pipeline?aba=comercial", tone: "info" },
        { rotulo: "Aguardando pagamento", valor: n(aguardandoPagamento), href: "/pipeline?aba=comercial", tone: "danger" },
        { rotulo: "Serviço contratado", valor: n(servicosContratadosP), href: "/pipeline?aba=comercial", tone: "success" },
      ],
    },
    {
      titulo: "Despachante Naval",
      icone: FileStack,
      indicadores: [
        { rotulo: "Processos em montagem", valor: n(processosAbertos), href: "/processos?status=aberto", tone: "info" },
        { rotulo: "Aguardando documentos", valor: n(processosDocs), href: "/processos?status=documentos_pendentes", tone: "warning" },
        { rotulo: "Prontos para protocolar", valor: n(processosProntos), href: "/processos?status=pronto_para_protocolo", tone: "warning" },
        { rotulo: "Protocolados", valor: n(processosProtocolados), href: "/processos?status=protocolado", tone: "info" },
        { rotulo: "Concluídos", valor: n(processosConcluidos), href: "/processos?status=concluido", tone: "success" },
      ],
    },
    {
      titulo: "Engenharia",
      icone: HardHat,
      indicadores: [
        { rotulo: "Obras cadastradas", valor: n(obrasCount), href: "/obras", tone: "info" },
        { rotulo: "Obras sem memorial gerado", valor: n(obrasSemDocumento), href: "/obras", tone: "warning" },
        { rotulo: "Agendamentos futuros", valor: n(agendamentosFuturos), href: "/agenda", tone: "info" },
      ],
    },
    {
      titulo: "Financeiro",
      icone: Wallet,
      indicadores: [
        { rotulo: "Taxas aguardando pagamento", valor: n(taxasPendentes), href: "/taxas?status=pendente", tone: "warning" },
        { rotulo: "Pagamentos em atraso", valor: n(pagamentosAtrasados), href: "/pendentes", tone: "danger" },
        { rotulo: "Recebimentos previstos", valor: n(recebimentosPrevistos), href: "/vendas", tone: "success" },
        { rotulo: "Despesas no mês", valor: n(despesasMes), href: "/vendas/despesas", tone: "neutral" },
      ],
    },
    {
      titulo: "Documentos",
      icone: FileText,
      indicadores: [
        { rotulo: "Documentos para gerar", valor: n(docsParaGerar), href: "/processos?status=documentos_pendentes", tone: "warning" },
        { rotulo: "Gerados (aguardando revisão)", valor: n(docsGerados), href: "/documentos", tone: "info" },
        { rotulo: "Protocolados", valor: n(docsProtocolados), href: "/documentos", tone: "success" },
      ],
    },
    {
      titulo: "Escola Náutica",
      icone: GraduationCap,
      indicadores: [
        { rotulo: "Alunos ativos", valor: n(alunosAtivos), href: "/alunos", tone: "info" },
        { rotulo: "Matrículas ativas", valor: n(matriculasAtivas), href: "/alunos", tone: "success" },
        { rotulo: "Provas agendadas", valor: n(provasAgendadas), href: "/agenda", tone: "warning" },
        { rotulo: "Provas aguardando correção", valor: n(aguardandoCorrecao), href: "/lms/provas", tone: "warning" },
      ],
    },
    {
      titulo: "Loja",
      icone: Store,
      indicadores: [
        { rotulo: "Orçamentos pendentes", valor: n(lojaOrcamentosPendentes), href: "/loja/orcamentos", tone: "warning" },
        { rotulo: "Vendas em andamento", valor: n(lojaVendasAndamento), href: "/loja/vendas", tone: "info" },
        { rotulo: "Entregas pendentes", valor: n(lojaEntregasPendentes), href: "/loja/entregas", tone: "warning" },
      ],
    },
    {
      titulo: "Central de Pendências",
      icone: AlarmClock,
      indicadores: [
        { rotulo: "Pendências de hoje", valor: n(pendHoje), href: "/pendencias", tone: "warning" },
        { rotulo: "Pendências atrasadas", valor: n(pendAtrasadas), href: "/pendencias", tone: "danger" },
        { rotulo: "Pendências da semana", valor: n(pendSemana), href: "/pendencias", tone: "info" },
      ],
    },
  ];

  return (
    <div className="space-y-gutter">
      <ResumoDoDia
        respOportunidade={respOportunidade}
        respProcesso={respProcesso}
        respTaxa={respTaxa}
        respPendencia={respPendencia}
      />

      {grupos.map((g) => (
        <GrupoCards key={g.titulo} grupo={g} />
      ))}
    </div>
  );
}

async function ResumoDoDia({
  respOportunidade,
  respProcesso,
  respTaxa,
  respPendencia,
}: {
  respOportunidade: ReturnType<typeof eq> | undefined;
  respProcesso: ReturnType<typeof eq> | undefined;
  respTaxa: ReturnType<typeof eq> | undefined;
  respPendencia: ReturnType<typeof eq> | undefined;
}) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().slice(0, 10);
  const fimHoje = new Date(hoje.getTime() + 86400000);
  const semanaStr = new Date(hoje.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const [clientesResposta, processosProtocolar, taxasHoje, docsGerar, entregasHoje, eventosHoje, pendenciasCriticas] =
    await Promise.all([
      db
        .select({ n: count() })
        .from(pipelineOportunidades)
        .where(
          and(
            inArray(pipelineOportunidades.estagio, ["primeiro_contato", "aguardando_documentacao", "negociacao", "orcamento_enviado"] as const),
            respOportunidade
          )
        ),
      db.select({ n: count() }).from(processos).where(and(eq(processos.status, "pronto_para_protocolo"), respProcesso)),
      db.select({ n: count() }).from(taxasPagar).where(and(eq(taxasPagar.status, "pendente"), eq(taxasPagar.vencimento, hojeStr), respTaxa)),
      db.select({ n: count() }).from(processos).where(and(eq(processos.status, "documentos_pendentes"), respProcesso)),
      db
        .select({ n: count() })
        .from(lojaEntregas)
        .where(and(eq(lojaEntregas.status, "pendente"), isNotNull(lojaEntregas.dataPrevista), lte(lojaEntregas.dataPrevista, semanaStr))),
      db
        .select({ n: count() })
        .from(agendaEventos)
        .where(and(gte(agendaEventos.dataHora, hoje), lt(agendaEventos.dataHora, fimHoje), ne(agendaEventos.status, "cancelado"))),
      db
        .select({ n: count() })
        .from(pendencias)
        .where(and(eq(pendencias.status, "pendente"), lte(pendencias.data, hojeStr), respPendencia)),
    ]);

  const itens: { rotulo: string; valor: number; href: string }[] = [
    { rotulo: "Clientes aguardando resposta", valor: clientesResposta[0]?.n ?? 0, href: "/pipeline?aba=comercial" },
    { rotulo: "Processos prontos para protocolar", valor: processosProtocolar[0]?.n ?? 0, href: "/processos?status=pronto_para_protocolo" },
    { rotulo: "Taxas vencendo hoje", valor: taxasHoje[0]?.n ?? 0, href: "/taxas?status=pendente" },
    { rotulo: "Documentos para gerar", valor: docsGerar[0]?.n ?? 0, href: "/processos?status=documentos_pendentes" },
    { rotulo: "Entregas programadas", valor: entregasHoje[0]?.n ?? 0, href: "/loja/entregas" },
    { rotulo: "Eventos de hoje", valor: eventosHoje[0]?.n ?? 0, href: "/agenda" },
    { rotulo: "Pendências críticas", valor: pendenciasCriticas[0]?.n ?? 0, href: "/pendencias" },
  ];

  return (
    <div className="rounded-xl border border-primary/30 bg-surface-container-lowest p-5">
      <h2 className="mb-4 flex items-center gap-2 font-display text-title-md font-semibold text-primary">
        <Sun size={16} /> Resumo do Dia
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {itens.map((item) => (
          <Link
            key={item.rotulo}
            href={item.href}
            className="rounded-lg border border-outline-variant p-3 transition-colors hover:border-primary"
          >
            <span className={`block font-display text-headline-md font-bold ${item.valor > 0 ? "text-primary" : "text-outline"}`}>
              {item.valor}
            </span>
            <span className="mt-0.5 block text-body-sm leading-tight text-on-surface-variant">{item.rotulo}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
