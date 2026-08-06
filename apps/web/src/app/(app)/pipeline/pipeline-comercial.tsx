import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Kanban } from "lucide-react";
import { db } from "@/db";
import { pipelineOportunidades, clientes, usuarios, orcamentos } from "@/db/schema";
import { LinkButton, EmptyState } from "@/components/ui";
import { PIPELINE_ESTAGIOS, PIPELINE_ESTAGIO_PERDIDO, rotuloPrazo } from "@/lib/status";
import { moverEstagioNoQuadro } from "./actions";
import { SeletorEstagio } from "./seletor-estagio";

function formatMoney(v: string | null | undefined) {
  if (!v) return null;
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function PipelineComercial({ estagioDestacado }: { estagioDestacado?: string }) {
  const lista = await db
    .select({
      id: pipelineOportunidades.id,
      titulo: pipelineOportunidades.titulo,
      estagio: pipelineOportunidades.estagio,
      servicoSolicitado: pipelineOportunidades.servicoSolicitado,
      valorEstimado: pipelineOportunidades.valorEstimado,
      orcamentoId: pipelineOportunidades.orcamentoId,
      orcamentoNumero: orcamentos.numero,
      orcamentoValor: orcamentos.valor,
      proximaAcao: pipelineOportunidades.proximaAcao,
      ultimoContatoEm: pipelineOportunidades.ultimoContatoEm,
      atualizadoEm: pipelineOportunidades.atualizadoEm,
      clienteId: pipelineOportunidades.clienteId,
      clienteNome: clientes.nome,
      responsavelNome: usuarios.nome,
    })
    .from(pipelineOportunidades)
    .leftJoin(clientes, eq(pipelineOportunidades.clienteId, clientes.id))
    .leftJoin(usuarios, eq(pipelineOportunidades.responsavelId, usuarios.id))
    .leftJoin(orcamentos, eq(pipelineOportunidades.orcamentoId, orcamentos.id))
    .orderBy(desc(pipelineOportunidades.atualizadoEm));

  const colunas = [...PIPELINE_ESTAGIOS, PIPELINE_ESTAGIO_PERDIDO];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-title-lg font-semibold text-primary">Pipeline Comercial</h2>
          <p className="text-body-sm text-on-surface-variant">
            Acompanhe cada cliente avançando pelas etapas do atendimento. Clique no cartão para abrir o
            cadastro completo do cliente.
          </p>
        </div>
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
            const destacada = estagioDestacado === coluna.key;
            return (
              <div key={coluna.key} className="w-72 flex-shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3
                    className={`flex items-center gap-1.5 font-display text-sm font-semibold ${
                      destacada ? "text-primary" : "text-primary"
                    }`}
                  >
                    <span>{coluna.emoji}</span>
                    {coluna.label}
                  </h3>
                  <span className="font-mono-caps text-[11px] text-outline">{itens.length}</span>
                </div>
                <div
                  className={`min-h-[80px] space-y-2 rounded-xl p-2 ${
                    destacada ? "bg-info-container" : "bg-surface-container-lowest"
                  }`}
                >
                  {itens.map((o) => {
                    const valorOrcamento = o.orcamentoValor ?? o.valorEstimado;
                    return (
                      <div key={o.id} className="space-y-2 rounded-lg border border-outline-variant bg-surface p-3">
                        {o.clienteId ? (
                          <Link
                            href={`/clientes/${o.clienteId}`}
                            className="block text-body-sm font-semibold text-primary hover:underline"
                          >
                            {o.clienteNome ?? o.titulo}
                          </Link>
                        ) : (
                          <span className="block text-body-sm font-semibold text-primary">{o.titulo}</span>
                        )}
                        <div className="space-y-1 text-body-sm text-outline">
                          {o.servicoSolicitado && <p className="text-primary">{o.servicoSolicitado}</p>}
                          {valorOrcamento && <p className="font-medium text-primary">{formatMoney(valorOrcamento)}</p>}
                          {o.responsavelNome && <p>Responsável: {o.responsavelNome}</p>}
                          {o.ultimoContatoEm && (
                            <p>Último contato: {new Date(o.ultimoContatoEm).toLocaleDateString("pt-BR")}</p>
                          )}
                          {o.proximaAcao && <p>Próxima ação: {o.proximaAcao}</p>}
                          <p className="text-[11px]">Situação: {coluna.label}</p>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Link
                            href={`/pipeline/${o.id}`}
                            className="text-[11px] text-outline hover:text-primary hover:underline"
                          >
                            detalhe
                          </Link>
                          <span className="text-[11px] text-outline">atualizado {rotuloPrazo(o.atualizadoEm)}</span>
                        </div>
                        <SeletorEstagio
                          oportunidadeId={o.id}
                          estagioAtual={o.estagio}
                          estagios={colunas}
                          action={moverEstagioNoQuadro}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
