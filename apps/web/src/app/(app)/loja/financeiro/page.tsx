import { and, eq, gte, sql } from "drizzle-orm";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { lojaVendas, lojaVendaPagamentos, clientes } from "@/db/schema";
import { StatCard, EmptyState, BackButton } from "@/components/ui";
import { formatarMoeda, infoStatusVenda } from "@/lib/loja";
import { Badge } from "@/components/ui";
import { formatarDataBR } from "@/lib/datas";

export default async function FinanceiroLojaPage() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const vendas = await db
    .select({
      id: lojaVendas.id,
      valorTotal: lojaVendas.valorTotal,
      custoTotal: lojaVendas.custoTotal,
      comissao: lojaVendas.comissao,
      frete: lojaVendas.frete,
      status: lojaVendas.status,
      criadoEm: lojaVendas.criadoEm,
      clienteNome: clientes.nome,
    })
    .from(lojaVendas)
    .innerJoin(clientes, eq(lojaVendas.clienteId, clientes.id))
    .orderBy(sql`${lojaVendas.criadoEm} desc`);

  const pagamentos = await db.select().from(lojaVendaPagamentos);

  const vendasMes = vendas.filter((v) => v.criadoEm >= inicioMes);
  const vendidoMes = vendasMes.reduce((acc, v) => acc + Number(v.valorTotal), 0);
  const recebidoMes = pagamentos
    .filter((p) => p.dataPagamento && p.dataPagamento >= inicioMes.toISOString().slice(0, 10))
    .reduce((acc, p) => acc + Number(p.valor), 0);
  const aReceber = vendas
    .filter((v) => ["aprovada", "aguardando_pagamento", "pagamento_parcial"].includes(v.status))
    .reduce((acc, v) => acc + Number(v.valorTotal), 0);
  const custoTotal = vendas.reduce((acc, v) => acc + Number(v.custoTotal ?? 0), 0);
  const lucroBruto = vendas.reduce((acc, v) => acc + (Number(v.valorTotal) - Number(v.custoTotal ?? 0)), 0);
  const comissoes = vendas.reduce((acc, v) => acc + Number(v.comissao ?? 0), 0);
  const fretes = vendas.reduce((acc, v) => acc + Number(v.frete ?? 0), 0);

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Financeiro da Loja</h1>
      <p className="text-body-sm text-outline">
        Visão exclusiva das vendas da Loja (origem LOJA) — o financeiro geral consolida tudo, mas aqui
        você enxerga somente o que a Loja vendeu, recebeu e está a receber.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Vendido no mês" value={formatarMoeda(vendidoMes)} />
        <StatCard icon={Wallet} label="Recebido no mês" value={formatarMoeda(recebidoMes)} tone="success" />
        <StatCard icon={Wallet} label="A receber" value={formatarMoeda(aReceber)} tone="warning" />
        <StatCard icon={Wallet} label="Lucro bruto (total)" value={formatarMoeda(lucroBruto)} tone="info" />
        <StatCard icon={Wallet} label="Custos dos produtos" value={formatarMoeda(custoTotal)} tone="neutral" />
        <StatCard icon={Wallet} label="Comissões" value={formatarMoeda(comissoes)} tone="neutral" />
        <StatCard icon={Wallet} label="Fretes" value={formatarMoeda(fretes)} tone="neutral" />
      </div>

      {vendas.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma venda da Loja ainda" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <ul className="divide-y divide-outline-variant">
            {vendas.map((v) => {
              const info = infoStatusVenda(v.status);
              return (
                <li key={v.id}>
                  <Link href={`/loja/vendas/${v.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-container-low">
                    <div>
                      <p className="text-body-md font-medium text-primary">{v.clienteNome}</p>
                      <p className="text-body-sm text-outline">{formatarDataBR(v.criadoEm)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-title-sm font-bold text-primary">{formatarMoeda(v.valorTotal)}</span>
                      <Badge tone={info.tone} size="sm">{info.label}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
