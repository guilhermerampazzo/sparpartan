import { desc, eq, sql } from "drizzle-orm";
import { ShoppingBag, TrendingUp, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { servicosContratados, clientes, servicos, pagamentos, orcamentos } from "@/db/schema";
import { StatCard, LinkButton, Button, ProgressBar, Badge, EmptyState, CampoMoeda, Campo, BackButton } from "@/components/ui";
import { registrarPagamento } from "./actions";

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function VendasPage() {
  const vendas = await db
    .select({
      id: servicosContratados.id,
      valor: servicosContratados.valor,
      dataContratacao: servicosContratados.dataContratacao,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
    })
    .from(servicosContratados)
    .innerJoin(clientes, eq(servicosContratados.clienteId, clientes.id))
    .innerJoin(servicos, eq(servicosContratados.servicoId, servicos.id))
    .orderBy(desc(servicosContratados.criadoEm));

  const todosPagamentos = await db.select().from(pagamentos);

  const [{ totalOrcamentos, totalAprovados }] = await db
    .select({
      totalOrcamentos: sql<number>`count(*)::int`,
      totalAprovados: sql<number>`count(*) filter (where ${orcamentos.status} = 'aprovado')::int`,
    })
    .from(orcamentos);

  const taxaConversao =
    totalOrcamentos > 0 ? ((totalAprovados / totalOrcamentos) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Financeiro</h1>
        <LinkButton href="/vendas/financeiro" variant="outlined" size="sm">
          Financeiro / BI
        </LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-gutter sm:grid-cols-4">
        <StatCard label="Serviços Vendidos" value={vendas.length} icon={ShoppingBag} tone="info" />
        <StatCard label="Taxa de Conversão" value={`${taxaConversao}%`} icon={TrendingUp} tone="success" />
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <p className="border-b border-outline-variant px-4 py-3 font-mono-caps text-label-sm uppercase tracking-wide text-outline">
          Serviços Contratados
        </p>
        {vendas.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nenhuma venda ainda"
            description="Aprove um orçamento para gerar a primeira."
          />
        ) : (
          <div className="divide-y divide-outline-variant">
            {vendas.map((venda) => {
              const pagamentosDaVenda = todosPagamentos.filter(
                (p) => p.servicoContratadoId === venda.id && p.status === "pago"
              );
              const totalPago = pagamentosDaVenda.reduce((sum, p) => sum + Number(p.valor), 0);
              const saldo = Number(venda.valor) - totalPago;
              const registrarPagamentoComId = registrarPagamento.bind(null, venda.id);

              return (
                <div key={venda.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-body-md font-medium text-primary">
                        {venda.servicoNome} — {venda.clienteNome}
                      </p>
                      <div className="mt-2 max-w-xs">
                        <ProgressBar
                          value={totalPago}
                          total={Number(venda.valor)}
                          label={`Pago: ${formatMoney(totalPago)} de ${formatMoney(Number(venda.valor))}`}
                          showValue={false}
                        />
                      </div>
                    </div>
                    {saldo <= 0 ? (
                      <Badge tone="success" icon={CheckCircle2}>
                        Quitado
                      </Badge>
                    ) : (
                      <Badge tone="warning">Saldo {formatMoney(saldo)}</Badge>
                    )}
                  </div>

                  {saldo > 0 && (
                    <form
                      action={registrarPagamentoComId}
                      className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4"
                    >
                      <CampoMoeda label="Valor" name="valor" required />
                      <Campo label="Data" name="dataPagamento" type="date" />
                      <Campo label="Forma" name="formaPagamento" />
                      <div className="flex items-end">
                        <Button type="submit" size="sm">
                          Registrar Pagamento
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
