import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  Building2,
  Ship,
  Anchor,
  Users,
  FileText,
  Wrench,
  Bell,
  Pencil,
  Trash2,
  Download,
  CheckCircle2,
  RefreshCcw,
} from "lucide-react";
import { db } from "@/db";
import { empresas, empresaEmbarcacoes, empresaMarinheiros, empresaDocumentos, empresaManutencoes, empresaAlertas, clientes } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { Button, ConfirmButton, LinkButton, Badge, EmptyState, BackButton } from "@/components/ui";
import { rotuloTipoDocumentoEmpresa, diasAte, TIPOS_DOCUMENTO_EMPRESA } from "@/lib/empresas";
import { formatarDataBR } from "@/lib/datas";
import {
  atualizarEmpresa,
  criarEmbarcacaoEmpresa,
  excluirEmbarcacaoEmpresa,
  criarMarinheiroEmpresa,
  excluirMarinheiroEmpresa,
  substituirDocumentoEmpresa,
  marcarDocumentoRegularizado,
  excluirDocumentoEmpresa,
  criarManutencaoEmpresa,
  excluirManutencaoEmpresa,
  recalcularAlertasEmpresa,
  resolverAlertaEmpresa,
} from "../actions";
import { DocumentoEmpresaForm } from "./documento-form";

export default async function EmpresaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [empresa] = await db.select().from(empresas).where(eq(empresas.id, id)).limit(1);
  if (!empresa) notFound();

  const [clienteVinculado] = empresa.clienteId
    ? await db.select({ nome: clientes.nome }).from(clientes).where(eq(clientes.id, empresa.clienteId)).limit(1)
    : [];

  const embarcacoes = await db
    .select()
    .from(empresaEmbarcacoes)
    .where(eq(empresaEmbarcacoes.empresaId, id))
    .orderBy(empresaEmbarcacoes.nome);

  const marinheiros = await db
    .select()
    .from(empresaMarinheiros)
    .where(eq(empresaMarinheiros.empresaId, id))
    .orderBy(empresaMarinheiros.nome);

  const documentos = await db
    .select()
    .from(empresaDocumentos)
    .where(eq(empresaDocumentos.empresaId, id))
    .orderBy(desc(empresaDocumentos.criadoEm));

  const manutencoes = await db
    .select()
    .from(empresaManutencoes)
    .where(eq(empresaManutencoes.empresaId, id))
    .orderBy(desc(empresaManutencoes.dataRealizada));

  const alertas = await db
    .select()
    .from(empresaAlertas)
    .where(and(eq(empresaAlertas.empresaId, id), eq(empresaAlertas.resolvido, false)))
    .orderBy(desc(empresaAlertas.criadoEm));

  const nomeEmbarcacao = (embarcacaoId: string | null) =>
    embarcacoes.find((e) => e.id === embarcacaoId)?.nome ?? null;

  return (
    <div className="space-y-gutter">
      <BackButton href="/gestao-empresas" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-pill bg-primary-container p-2.5 text-on-primary-container">
            <Building2 size={18} />
          </span>
          <div>
            <h1 className="font-display text-headline-lg font-bold text-primary">{empresa.razaoSocial}</h1>
            <p className="text-body-sm text-outline">
              {[empresa.nomeFantasia, empresa.cnpj, empresa.responsavel].filter(Boolean).join(" · ")}
            </p>
            {clienteVinculado && (
              <p className="text-body-sm text-outline">Vinculada ao cliente: {clienteVinculado.nome}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={empresa.status === "ativa" ? "success" : "neutral"} size="sm">
            {empresa.status === "ativa" ? "Ativa" : "Inativa"}
          </Badge>
          <LinkButton href={`/gestao-empresas/${id}/editar`} variant="outlined" size="sm" icon={Pencil}>
            Editar
          </LinkButton>
        </div>
      </div>
      {empresa.observacoes && <p className="text-body-sm text-outline">{empresa.observacoes}</p>}

      <SectionCard title={`Alertas (${alertas.length})`}>
        {alertas.length === 0 ? (
          <p className="text-body-sm text-outline">Nenhum alerta ativo. ✅</p>
        ) : (
          <ul className="space-y-2">
            {alertas.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline-variant px-4 py-2.5">
                <span className="flex items-center gap-2 text-body-sm text-primary">
                  <Bell size={14} className={a.tipo === "vencido" ? "text-danger" : a.tipo === "vencimento_urgente" ? "text-warning" : "text-outline"} />
                  {a.mensagem}
                </span>
                <form action={resolverAlertaEmpresa.bind(null, id, a.id)}>
                  <Button type="submit" variant="text" size="sm" icon={CheckCircle2}>
                    Resolver
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={`Embarcações (${embarcacoes.length})`}>
        <form action={criarEmbarcacaoEmpresa.bind(null, id)} className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-3 sm:grid-cols-2 lg:grid-cols-4">
          <input name="nome" placeholder="Nome *" required className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="numeroInscricao" placeholder="Nº inscrição" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="tipo" placeholder="Tipo" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="motor" placeholder="Motor" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="anoFabricacao" placeholder="Ano" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="numeroSerie" placeholder="Nº série" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="atividade" placeholder="Atividade" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <Button type="submit" size="sm" icon={Ship}>Adicionar</Button>
        </form>
        {embarcacoes.length === 0 ? (
          <p className="text-body-sm text-outline">Nenhuma embarcação cadastrada.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {embarcacoes.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-body-md text-primary">{e.nome}</p>
                  <p className="text-body-sm text-outline">
                    {[e.numeroInscricao && `Inscrição ${e.numeroInscricao}`, e.tipo, e.anoFabricacao, e.motor].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <form action={excluirEmbarcacaoEmpresa.bind(null, id, e.id)}>
                  <ConfirmButton mensagem={`Excluir a embarcação "${e.nome}"?`} variant="text" size="sm">
                    <Trash2 size={12} />
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={`Marinheiros (${marinheiros.length})`}>
        <form action={criarMarinheiroEmpresa.bind(null, id)} className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-3 sm:grid-cols-2 lg:grid-cols-4">
          <input name="nome" placeholder="Nome *" required className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="cpf" placeholder="CPF" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="funcao" placeholder="Função" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="numeroHabilitacao" placeholder="Nº habilitação" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="categoria" placeholder="Categoria" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="dataEmissao" type="date" placeholder="Emissão" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="dataValidade" type="date" placeholder="Validade" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <Button type="submit" size="sm" icon={Users}>Adicionar</Button>
        </form>
        {marinheiros.length === 0 ? (
          <p className="text-body-sm text-outline">Nenhum marinheiro cadastrado.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {marinheiros.map((m) => {
              const dias = diasAte(m.dataValidade);
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <p className="text-body-md text-primary">{m.nome}</p>
                    <p className="text-body-sm text-outline">
                      {[m.funcao, m.numeroHabilitacao && `Hab. ${m.numeroHabilitacao}`, m.categoria].filter(Boolean).join(" · ")}
                      {m.dataValidade && ` · Validade ${formatarDataBR(m.dataValidade)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dias !== null && dias < 0 && <Badge tone="danger" size="sm">Habilitação vencida</Badge>}
                    {dias !== null && dias >= 0 && dias <= 35 && <Badge tone="warning" size="sm">Vence em {dias}d</Badge>}
                    {m.habilitacaoCaminho && (
                      <a href={`/api/empresas/marinheiro/${m.id}`} className="text-body-sm text-primary hover:underline">
                        <Download size={12} />
                      </a>
                    )}
                    <form action={excluirMarinheiroEmpresa.bind(null, id, m.id)}>
                      <ConfirmButton mensagem={`Excluir marinheiro "${m.nome}"?`} variant="text" size="sm">
                        <Trash2 size={12} />
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={`Documentos (${documentos.length})`}>
        <DocumentoEmpresaForm empresaId={id} embarcacoes={embarcacoes} />
        {documentos.length === 0 ? (
          <p className="mt-4 text-body-sm text-outline">Nenhum documento cadastrado — anexe o primeiro PDF acima (a leitura automática tenta preencher os campos).</p>
        ) : (
          <ul className="mt-4 divide-y divide-outline-variant">
            {documentos.map((d) => {
              const dias = diasAte(d.dataVencimento);
              const situacao = d.regularizado ? null : dias === null ? null : dias < 0 ? "vencido" : dias <= 15 ? "urgente" : dias <= 35 ? "proximo" : "em_dia";
              return (
                <li key={d.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-body-md text-primary">
                        {rotuloTipoDocumentoEmpresa(d.tipo)}
                        {d.titulo ? ` — ${d.titulo}` : ""}
                        {nomeEmbarcacao(d.embarcacaoId) ? ` · ${nomeEmbarcacao(d.embarcacaoId)}` : ""}
                      </p>
                      <p className="text-body-sm text-outline">
                        {[d.numero && `Nº ${d.numero}`, d.dataEmissao && `Emissão ${formatarDataBR(d.dataEmissao)}`, d.dataVencimento && `Vencimento ${formatarDataBR(d.dataVencimento)}`].filter(Boolean).join(" · ")}
                      </p>
                      {d.observacoes && <p className="text-body-sm text-outline">{d.observacoes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {situacao === "vencido" && <Badge tone="danger" size="sm">Vencido</Badge>}
                      {situacao === "urgente" && <Badge tone="warning" size="sm">Urgente ({dias}d)</Badge>}
                      {situacao === "proximo" && <Badge tone="info" size="sm">Vence em {dias}d</Badge>}
                      {d.regularizado && <Badge tone="success" size="sm">Regularizado</Badge>}
                      {d.caminho && (
                        <a href={`/api/empresas/documento/${d.id}`} className="text-body-sm text-primary hover:underline">
                          <Download size={12} /> Abrir
                        </a>
                      )}
                      <form action={marcarDocumentoRegularizado.bind(null, id, d.id)}>
                        <Button type="submit" variant="text" size="sm" icon={CheckCircle2}>Regularizar</Button>
                      </form>
                      <form action={excluirDocumentoEmpresa.bind(null, id, d.id)}>
                        <ConfirmButton mensagem={`Excluir documento?`} variant="text" size="sm">
                          <Trash2 size={12} />
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                  {d.substituidoPorId && (
                    <p className="mt-1 text-body-sm text-outline">↳ Substituído por documento mais recente (histórico mantido)</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={`Manutenções (${manutencoes.length})`}>
        <form action={criarManutencaoEmpresa.bind(null, id)} className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-3 sm:grid-cols-2 lg:grid-cols-4">
          <select name="tipo" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary">
            <option value="manutencao">Manutenção</option>
            <option value="troca_oleo">Troca de óleo</option>
          </select>
          <select name="embarcacaoId" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary">
            <option value="">Embarcação (opcional)</option>
            {embarcacoes.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
          <input name="descricao" placeholder="Descrição *" required className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="dataRealizada" type="date" placeholder="Data realizada" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="horimetro" placeholder="Horímetro" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="proximaManutencao" type="date" placeholder="Próxima manutenção" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="proximaTrocaOleo" type="date" placeholder="Próxima troca de óleo" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="oleoUtilizado" placeholder="Óleo utilizado" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="responsavel" placeholder="Responsável" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <Button type="submit" size="sm" icon={Wrench}>Adicionar</Button>
        </form>
        {manutencoes.length === 0 ? (
          <p className="text-body-sm text-outline">Nenhuma manutenção registrada.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {manutencoes.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="text-body-md text-primary">
                    {m.tipo === "troca_oleo" ? "Troca de óleo" : "Manutenção"}{m.descricao ? ` — ${m.descricao}` : ""}
                    {nomeEmbarcacao(m.embarcacaoId) ? ` · ${nomeEmbarcacao(m.embarcacaoId)}` : ""}
                  </p>
                  <p className="text-body-sm text-outline">
                    {[m.dataRealizada && `Realizada em ${formatarDataBR(m.dataRealizada)}`, m.horimetro && `Horímetro ${m.horimetro}`, m.oleoUtilizado && `Óleo: ${m.oleoUtilizado}`, m.responsavel && `Resp.: ${m.responsavel}`].filter(Boolean).join(" · ")}
                  </p>
                  {(m.proximaManutencao || m.proximaTrocaOleo) && (
                    <p className="text-body-sm text-outline">
                      Próximas: {[m.proximaManutencao && `manutenção ${formatarDataBR(m.proximaManutencao)}`, m.proximaTrocaOleo && `óleo ${formatarDataBR(m.proximaTrocaOleo)}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <form action={excluirManutencaoEmpresa.bind(null, id, m.id)}>
                  <ConfirmButton mensagem="Excluir manutenção?" variant="text" size="sm">
                    <Trash2 size={12} />
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <form action={recalcularAlertasEmpresa.bind(null, id)}>
        <Button type="submit" variant="outlined" size="sm" icon={RefreshCcw}>
          Recalcular alertas
        </Button>
      </form>
    </div>
  );
}
