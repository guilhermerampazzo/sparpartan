import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orcamentos, clientes, servicos } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { StatusBadge, Button, LinkButton, BackButton, CadastradoPor } from "@/components/ui";
import { statusOrcamento, urgenciaVencimento, infoUrgencia, rotuloPrazo } from "@/lib/status";
import {
  gerarPdfOrcamento,
  aprovarOrcamento,
  recusarOrcamento,
  gerarLinkAprovacao,
  enviarOrcamentoPorEmail,
} from "../actions";

function formatMoney(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function OrcamentoDetalhesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ link?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { link, erro } = await searchParams;

  const [orcamento] = await db.select().from(orcamentos).where(eq(orcamentos.id, id)).limit(1);
  if (!orcamento) notFound();

  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, orcamento.clienteId))
    .limit(1);
  const [servico] = orcamento.servicoId
    ? await db.select().from(servicos).where(eq(servicos.id, orcamento.servicoId)).limit(1)
    : [];

  const gerarPdfComId = gerarPdfOrcamento.bind(null, id);
  const aprovarComId = aprovarOrcamento.bind(null, id);
  const recusarComId = recusarOrcamento.bind(null, id);
  const gerarLinkAprovacaoComId = gerarLinkAprovacao.bind(null, id);
  const enviarPorEmailComId = enviarOrcamentoPorEmail.bind(null, id);

  const urgenciaValidade = orcamento.status === "pendente" ? urgenciaVencimento(orcamento.validoAte) : null;

  return (
    <div className="space-y-gutter">
      <BackButton href="/orcamentos" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-headline-lg font-bold text-primary">
            Orçamento {orcamento.numero}
          </h1>
          <StatusBadge status={statusOrcamento(orcamento.status)} />
        </div>
        <CadastradoPor usuarioId={orcamento.criadoPorId} />
        {orcamento.status === "pendente" && (
          <LinkButton href={`/orcamentos/${id}/editar`} variant="outlined">
            Editar
          </LinkButton>
        )}
      </div>

      <SectionCard title="Detalhes">
        <dl className="grid grid-cols-2 gap-4 text-body-md sm:grid-cols-4">
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Cliente</dt>
            <dd className="text-primary">{cliente?.nome}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Serviço</dt>
            <dd className="text-primary">{servico?.nome ?? orcamento.descricao ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Valor</dt>
            <dd className="text-primary">{formatMoney(orcamento.valor)}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Válido até</dt>
            <dd className="flex items-center gap-2 text-primary">
              {orcamento.validoAte ?? "—"}
              {urgenciaValidade && urgenciaValidade !== "sem_data" && urgenciaValidade !== "em_dia" && (
                <StatusBadge status={infoUrgencia(urgenciaValidade)} size="sm" />
              )}
              {orcamento.validoAte && urgenciaValidade && urgenciaValidade !== "sem_data" && (
                <span className="text-body-sm text-outline">({rotuloPrazo(orcamento.validoAte)})</span>
              )}
            </dd>
          </div>
        </dl>
        {(orcamento.descricao || orcamento.observacoes) && (
          <dl className="mt-4 grid grid-cols-1 gap-4 text-body-md sm:grid-cols-2">
            {orcamento.descricao && (
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">Descrição</dt>
                <dd className="whitespace-pre-wrap text-primary">{orcamento.descricao}</dd>
              </div>
            )}
            {orcamento.observacoes && (
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">Observações</dt>
                <dd className="whitespace-pre-wrap text-primary">{orcamento.observacoes}</dd>
              </div>
            )}
          </dl>
        )}
      </SectionCard>

      <SectionCard title="Ações">
        <div className="flex flex-wrap gap-3">
          {orcamento.pdfCaminho ? (
            <LinkButton href={`/api/orcamentos/${orcamento.id}`} variant="outlined">
              Baixar PDF
            </LinkButton>
          ) : (
            <form action={gerarPdfComId}>
              <Button type="submit" variant="outlined">
                Gerar PDF
              </Button>
            </form>
          )}

          {cliente?.email && (
            <form action={enviarPorEmailComId}>
              <Button type="submit" variant="outlined">
                Enviar por E-mail
              </Button>
            </form>
          )}

          {orcamento.status === "pendente" && (
            <>
              <form action={aprovarComId}>
                <Button type="submit">Aprovar (converter em Venda)</Button>
              </form>
              <form action={recusarComId}>
                <Button type="submit" variant="outlined">
                  Recusar
                </Button>
              </form>
              <form action={gerarLinkAprovacaoComId}>
                <Button type="submit" variant="text">
                  Gerar link para o cliente aprovar
                </Button>
              </form>
            </>
          )}
        </div>
        {link && (
          <div className="mt-4 rounded-lg bg-info-container p-3 text-body-sm text-on-info-container">
            Link gerado: <span className="break-all font-mono">{`${process.env.AUTH_URL || "http://localhost:8080"}/c/${link}`}</span>
          </div>
        )}
        {erro && (
          <div className="mt-4 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">
            {erro}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
