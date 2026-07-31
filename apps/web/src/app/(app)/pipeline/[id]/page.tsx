import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pipelineOportunidades, pipelineHistorico, clientes, usuarios } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { StatusBadge, Button, LinkButton, BackButton } from "@/components/ui";
import { statusPipeline, PIPELINE_ESTAGIOS, PIPELINE_ESTAGIO_PERDIDO, rotuloPrazo } from "@/lib/status";
import { moverEstagio, marcarPerdida } from "../actions";

function formatMoney(v: string | null) {
  if (!v) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function OportunidadeDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [oportunidade] = await db
    .select()
    .from(pipelineOportunidades)
    .where(eq(pipelineOportunidades.id, id))
    .limit(1);
  if (!oportunidade) notFound();

  const [cliente] = oportunidade.clienteId
    ? await db.select().from(clientes).where(eq(clientes.id, oportunidade.clienteId)).limit(1)
    : [];

  const historico = await db
    .select({
      id: pipelineHistorico.id,
      estagioAnterior: pipelineHistorico.estagioAnterior,
      estagioNovo: pipelineHistorico.estagioNovo,
      criadoEm: pipelineHistorico.criadoEm,
      usuarioNome: usuarios.nome,
    })
    .from(pipelineHistorico)
    .leftJoin(usuarios, eq(pipelineHistorico.usuarioId, usuarios.id))
    .where(eq(pipelineHistorico.oportunidadeId, id))
    .orderBy(desc(pipelineHistorico.criadoEm));

  const colunas = [...PIPELINE_ESTAGIOS, PIPELINE_ESTAGIO_PERDIDO];
  async function marcarPerdidaComId(formData: FormData) {
    "use server";
    await marcarPerdida(id, formData);
  }

  return (
    <div className="space-y-gutter">
      <BackButton href="/pipeline" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-headline-lg font-bold text-primary">{oportunidade.titulo}</h1>
          <StatusBadge status={statusPipeline(oportunidade.estagio)} />
        </div>
        <LinkButton href={`/pipeline/${id}/editar`} variant="outlined">
          Editar
        </LinkButton>
      </div>

      <SectionCard title="Detalhes">
        <dl className="grid grid-cols-2 gap-4 text-body-md sm:grid-cols-4">
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Cliente</dt>
            <dd className="text-primary">{cliente?.nome ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Telefone</dt>
            <dd className="text-primary">{oportunidade.telefoneContato ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Origem</dt>
            <dd className="text-primary">{oportunidade.origem ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Valor Estimado</dt>
            <dd className="text-primary">{formatMoney(oportunidade.valorEstimado)}</dd>
          </div>
        </dl>
        {oportunidade.observacoes && (
          <div className="mt-4">
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Observações</dt>
            <dd className="whitespace-pre-wrap text-primary">{oportunidade.observacoes}</dd>
          </div>
        )}
        {oportunidade.estagio === "perdido" && oportunidade.motivoPerda && (
          <div className="mt-4 rounded-lg bg-danger-container p-3 text-body-sm text-on-danger-container">
            Motivo da perda: {oportunidade.motivoPerda}
          </div>
        )}
      </SectionCard>

      {oportunidade.estagio !== "perdido" && (
        <SectionCard title="Mudar Estágio">
          <div className="flex flex-wrap gap-2">
            {colunas
              .filter((c) => c.key !== oportunidade.estagio && c.key !== "perdido")
              .map((c) => {
                async function acao() {
                  "use server";
                  await moverEstagio(id, c.key);
                }
                return (
                  <form key={c.key} action={acao}>
                    <Button type="submit" variant="outlined" size="sm">
                      {c.emoji} {c.label}
                    </Button>
                  </form>
                );
              })}
          </div>
          <form action={marcarPerdidaComId} className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                Motivo da perda
              </span>
              <input
                name="motivoPerda"
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              />
            </label>
            <Button type="submit" variant="danger" size="sm">
              🔴 Marcar como Perdido
            </Button>
          </form>
        </SectionCard>
      )}

      <SectionCard title="Histórico do Andamento">
        {historico.length === 0 ? (
          <p className="text-body-sm text-outline">Sem movimentações registradas.</p>
        ) : (
          <ul className="space-y-3">
            {historico.map((h) => (
              <li key={h.id} className="flex items-center justify-between text-body-sm">
                <span className="text-primary">
                  {h.estagioAnterior ? (
                    <>
                      {statusPipeline(h.estagioAnterior).label} → {statusPipeline(h.estagioNovo).label}
                    </>
                  ) : (
                    <>Oportunidade criada em {statusPipeline(h.estagioNovo).label}</>
                  )}
                  {h.usuarioNome && <span className="text-outline"> · {h.usuarioNome}</span>}
                </span>
                <span className="text-outline">{rotuloPrazo(h.criadoEm)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
