import { desc, eq } from "drizzle-orm";
import { Kanban } from "lucide-react";
import { db } from "@/db";
import { pipelineOportunidades, clientes } from "@/db/schema";
import { LinkButton, EmptyState } from "@/components/ui";
import { PIPELINE_ESTAGIOS, PIPELINE_ESTAGIO_PERDIDO, rotuloPrazo } from "@/lib/status";
import { moverEstagioNoQuadro } from "./actions";

function formatMoney(v: string | null) {
  if (!v) return null;
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PipelinePage() {
  const lista = await db
    .select({
      id: pipelineOportunidades.id,
      titulo: pipelineOportunidades.titulo,
      estagio: pipelineOportunidades.estagio,
      valorEstimado: pipelineOportunidades.valorEstimado,
      telefoneContato: pipelineOportunidades.telefoneContato,
      atualizadoEm: pipelineOportunidades.atualizadoEm,
      clienteNome: clientes.nome,
    })
    .from(pipelineOportunidades)
    .leftJoin(clientes, eq(pipelineOportunidades.clienteId, clientes.id))
    .orderBy(desc(pipelineOportunidades.atualizadoEm));

  const colunas = [...PIPELINE_ESTAGIOS, PIPELINE_ESTAGIO_PERDIDO];
  const todosEstagios = colunas.map((c) => c.key);

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Pipeline Comercial</h1>
        <LinkButton href="/pipeline/novo">+ Nova Oportunidade</LinkButton>
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Nenhuma oportunidade no funil ainda"
          action={{ label: "+ Nova Oportunidade", href: "/pipeline/novo" }}
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {colunas.map((coluna) => {
            const itens = lista.filter((o) => o.estagio === coluna.key);
            return (
              <div key={coluna.key} className="w-72 flex-shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold text-primary">
                    <span>{coluna.emoji}</span>
                    {coluna.label}
                  </h2>
                  <span className="font-mono-caps text-[11px] text-outline">{itens.length}</span>
                </div>
                <div className="space-y-2 rounded-xl bg-surface-container-lowest p-2 min-h-[80px]">
                  {itens.map((o) => (
                    <div
                      key={o.id}
                      className="space-y-2 rounded-lg border border-outline-variant bg-surface p-3"
                    >
                      <a
                        href={`/pipeline/${o.id}`}
                        className="block text-body-sm font-semibold text-primary hover:underline"
                      >
                        {o.titulo}
                      </a>
                      <div className="text-body-sm text-outline">
                        {o.clienteNome ?? o.telefoneContato ?? "Sem contato vinculado"}
                      </div>
                      {o.valorEstimado && (
                        <div className="text-body-sm font-medium text-primary">
                          {formatMoney(o.valorEstimado)}
                        </div>
                      )}
                      <div className="text-[11px] text-outline">
                        atualizado {rotuloPrazo(o.atualizadoEm)}
                      </div>
                      <form action={moverEstagioNoQuadro}>
                        <input type="hidden" name="oportunidadeId" value={o.id} />
                        <select
                          name="novoEstagio"
                          defaultValue={o.estagio}
                          onChange={(e) => e.currentTarget.form?.requestSubmit()}
                          className="w-full rounded-md border border-outline-variant bg-surface px-2 py-1 text-[11px] text-primary outline-none focus:border-primary"
                        >
                          {todosEstagios.map((chave) => {
                            const info = colunas.find((c) => c.key === chave)!;
                            return (
                              <option key={chave} value={chave}>
                                {info.emoji} {info.label}
                              </option>
                            );
                          })}
                        </select>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
