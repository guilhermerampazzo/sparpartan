import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { Ship, XCircle } from "lucide-react";
import { db } from "@/db";
import {
  processos,
  clientes,
  servicos,
  embarcacoes,
  modelosDocumento,
  documentosGerados,
} from "@/db/schema";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { Stepper, ChecklistItem, ProgressBar, AlertCard, Button, ConfirmButton, BackButton } from "@/components/ui";
import { CadastradoPor } from "@/components/ui/cadastrado-por";
import { PROCESSO_STEPS, urgenciaVencimento, infoUrgencia, vencimentoProtocolo, rotuloPrazo } from "@/lib/status";
import {
  definirEmbarcacao,
  protocolarProcesso,
  concluirProcesso,
  cancelarProcesso,
  gerarLinkDocumentos,
  gerarLinkAcompanhamento,
} from "../actions";

export default async function ProcessoDetalhesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ link?: string }>;
}) {
  const { id } = await params;
  const { link } = await searchParams;

  const [processo] = await db.select().from(processos).where(eq(processos.id, id)).limit(1);
  if (!processo) notFound();

  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, processo.clienteId))
    .limit(1);
  const [servico] = await db
    .select()
    .from(servicos)
    .where(eq(servicos.id, processo.servicoId))
    .limit(1);

  const embarcacoesDoCliente = await db
    .select()
    .from(embarcacoes)
    .where(eq(embarcacoes.clienteId, processo.clienteId));

  const embarcacaoAtual = processo.embarcacaoId
    ? embarcacoesDoCliente.find((e) => e.id === processo.embarcacaoId)
    : null;

  const modelosDoServico = await db
    .select()
    .from(modelosDocumento)
    .where(and(eq(modelosDocumento.servicoId, processo.servicoId), eq(modelosDocumento.ativo, true)));

  const documentosDoProcesso = await db
    .select()
    .from(documentosGerados)
    .where(eq(documentosGerados.processoId, id));

  const checklist = modelosDoServico.map((modelo) => {
    const gerado = documentosDoProcesso.find((d) => d.modeloId === modelo.id);
    return { modelo, gerado };
  });

  const obrigatoriosFaltando = checklist.filter((item) => item.modelo.obrigatorio && !item.gerado);
  const podeProtocolar =
    obrigatoriosFaltando.length === 0 &&
    processo.status !== "protocolado" &&
    processo.status !== "concluido";

  const definirEmbarcacaoComId = definirEmbarcacao.bind(null, id);
  const protocolarComId = protocolarProcesso.bind(null, id);
  const concluirComId = concluirProcesso.bind(null, id);
  const cancelarComId = cancelarProcesso.bind(null, id);
  const gerarLinkDocumentosComId = gerarLinkDocumentos.bind(null, id);
  const gerarLinkAcompanhamentoComId = gerarLinkAcompanhamento.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/processos" />
      <div>
        <h1 className="font-display text-headline-lg font-bold text-primary">
          {servico?.nome} — {cliente?.nome}
        </h1>
        <CadastradoPor usuarioId={processo.criadoPorId} />
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <Stepper
          steps={PROCESSO_STEPS}
          currentKey={processo.status}
          cancelled={processo.status === "cancelado"}
        />
        {processo.status !== "cancelado" && processo.status !== "concluido" && (
          <form action={cancelarComId} className="mt-4 flex justify-end">
            <ConfirmButton
              mensagem={`Cancelar o atendimento "${servico?.nome ?? "deste serviço"}"? O cliente desistiu ou o serviço não será mais feito.`}
              variant="text"
              icon={<XCircle size={14} />}
            >
              Cancelar Atendimento
            </ConfirmButton>
          </form>
        )}
      </div>

      <SectionCard title="Links de autoatendimento">
        {link && (
          <div className="mb-4 rounded-lg bg-info-container p-3 text-body-sm text-on-info-container">
            Link gerado: <span className="break-all font-mono">{`${process.env.AUTH_URL || "http://localhost:8080"}/c/${link}`}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <form action={gerarLinkDocumentosComId}>
            <Button type="submit" variant="outlined" size="sm">
              Gerar link de cobrança de documentos
            </Button>
          </form>
          <form action={gerarLinkAcompanhamentoComId}>
            <Button type="submit" variant="outlined" size="sm">
              Gerar link de acompanhamento
            </Button>
          </form>
        </div>
      </SectionCard>

      <SectionCard title="Embarcação">
        {embarcacaoAtual ? (
          <Link href={`/embarcacoes/${embarcacaoAtual.id}`} className="inline-flex items-center gap-2 text-body-md text-primary hover:underline">
            <Ship size={16} /> {embarcacaoAtual.nome}
          </Link>
        ) : (
          <form action={definirEmbarcacaoComId} className="flex items-end gap-4">
            <div className="w-64">
              <CampoSelect
                label="Vincular Embarcação"
                name="embarcacaoId"
                options={[
                  { value: "", label: "Nenhuma" },
                  ...embarcacoesDoCliente.map((e) => ({ value: e.id, label: e.nome })),
                ]}
              />
            </div>
            <Button type="submit" variant="outlined" size="sm">
              Salvar
            </Button>
          </form>
        )}
      </SectionCard>

      <SectionCard title="Checklist de Conformidade">
        {modelosDoServico.length === 0 ? (
          <p className="text-body-sm text-outline">
            Nenhum modelo de documento vinculado a este serviço ainda. Importe um modelo em{" "}
            <Link href="/configuracoes/modelos/novo" className="text-primary hover:underline">
              Configurações → Modelos → Importar Modelo
            </Link>{" "}
            e associe ao serviço &quot;{servico?.nome}&quot;.
          </p>
        ) : (
          <>
            <ProgressBar
              value={checklist.filter((c) => c.gerado).length}
              total={checklist.length}
              label="Documentos gerados"
            />
            <div className="mt-4">
              {checklist.map(({ modelo, gerado }) => (
                <ChecklistItem
                  key={modelo.id}
                  done={!!gerado}
                  label={modelo.nome}
                  hint={modelo.obrigatorio ? "obrigatório" : undefined}
                  action={
                    gerado
                      ? { label: "Ver documento", href: `/documentos/${gerado.id}` }
                      : {
                          label: "Gerar",
                          href: `/documentos/gerar?processoId=${id}&clienteId=${processo.clienteId}&embarcacaoId=${processo.embarcacaoId ?? ""}&modeloId=${modelo.id}`,
                        }
                  }
                />
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {processo.status === "protocolado" ||
      processo.status === "aguardando_retorno_marinha" ||
      processo.status === "concluido" ? (
        <SectionCard title="Protocolo">
          {(processo.status === "protocolado" || processo.status === "aguardando_retorno_marinha") &&
            processo.dataProtocolo && (
              <div className="mb-4">
                {(() => {
                  const venc = vencimentoProtocolo(processo.dataProtocolo);
                  const urgencia = urgenciaVencimento(venc);
                  const info = infoUrgencia(urgencia);
                  return (
                    <AlertCard
                      tone={info.tone}
                      title={`Prazo do protocolo (60 dias): ${info.label}`}
                      description={`Vence ${rotuloPrazo(venc)} (${venc.toLocaleDateString("pt-BR")}).`}
                    />
                  );
                })()}
              </div>
            )}
          <dl className="grid grid-cols-2 gap-4 text-body-md sm:grid-cols-3">
            <div>
              <dt className="font-mono-caps text-label-sm uppercase text-outline">Número</dt>
              <dd className="text-primary">{processo.numeroProtocolo}</dd>
            </div>
            <div>
              <dt className="font-mono-caps text-label-sm uppercase text-outline">Data</dt>
              <dd className="text-primary">{processo.dataProtocolo ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-mono-caps text-label-sm uppercase text-outline">Comprovante</dt>
              <dd className="text-primary">
                {processo.protocoloEscaneadoCaminho ? (
                  <a
                    href={`/api/processos/${processo.id}/comprovante`}
                    className="text-primary hover:underline"
                  >
                    Baixar
                  </a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
          {processo.status === "protocolado" && (
            <div className="mt-4 flex flex-wrap gap-3">
              {processo.exigenciaObservacao && (
                <p className="w-full rounded-lg bg-warning-container px-3 py-2 text-body-sm text-on-warning-container">
                  <strong>Exigência:</strong> {processo.exigenciaObservacao}
                </p>
              )}
              <form action={concluirComId}>
                <Button type="submit" variant="outlined">
                  Marcar como Concluído
                </Button>
              </form>
            </div>
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Protocolar">
          {!podeProtocolar && obrigatoriosFaltando.length > 0 && (
            <div className="mb-4">
              <AlertCard
                tone="warning"
                title={`Faltam ${obrigatoriosFaltando.length} documento(s) obrigatório(s)`}
                description="Gere os documentos pendentes no checklist acima antes de protocolar."
              />
            </div>
          )}
          <p className="mb-4 text-body-sm text-outline">
            Ao confirmar, o cliente recebe um e-mail automático com o número do protocolo — e,
            se o serviço for de escola náutica, com o dia da prova marcada (se houver).
          </p>
          <form action={protocolarComId} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo label="Número do Protocolo" name="numeroProtocolo" required />
            <Campo label="Data" name="dataProtocolo" type="date" />
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                Comprovante Escaneado (opcional)
              </span>
              <input
                name="comprovante"
                type="file"
                accept="image/*,.pdf"
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
              />
            </label>
            <div className="flex items-end sm:col-span-3">
              <Button type="submit" disabled={!podeProtocolar}>
                Confirmar Protocolo
              </Button>
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
