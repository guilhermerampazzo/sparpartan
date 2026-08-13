import Link from "next/link";
import { eq, and, sql, count, gte, lte, inArray } from "drizzle-orm";
import {
  Package,
  Receipt,
  ShoppingBag,
  Truck,
  Users,
  ClipboardList,
  Boxes,
  Store,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { db } from "@/db";
import { lojaOrcamentos, lojaVendas, lojaEntregas, lojaProdutos, lojaCompras } from "@/db/schema";
import { BackButton, StatCard } from "@/components/ui";
import { formatarMoeda } from "@/lib/loja";

const CARTOES = [
  { href: "/loja/catalogo", icon: Package, title: "Catálogo", description: "Cadastro completo dos produtos (administrativo)." },
  { href: "/loja/catalogo-cliente", icon: ShoppingCart, title: "Catálogo Cliente", description: "Visualização comercial com carrinho." },
  { href: "/loja/orcamentos", icon: Receipt, title: "Orçamentos", description: "Propostas da loja com PDF, WhatsApp e conversão em venda." },
  { href: "/loja/vendas", icon: ShoppingBag, title: "Vendas", description: "Ficha de cada venda com financeiro e documentos." },
  { href: "/loja/entregas", icon: Truck, title: "Entregas", description: "Painel de entregas pendentes e em transporte." },
  { href: "/loja/fornecedores", icon: Users, title: "Fornecedores", description: "Cadastro com produtos fornecidos e preços." },
  { href: "/loja/compras", icon: ClipboardList, title: "Compras", description: "Pedidos de compra inteligentes por fornecedor." },
  { href: "/loja/estoque", icon: Boxes, title: "Estoque", description: "Disponível, reservado, mínimo e alerta de reposição." },
];

export default async function LojaPage() {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);

  const [vendasMes] = await db
    .select({ total: sql<number>`coalesce(sum(${lojaVendas.valorTotal}), 0)::float` })
    .from(lojaVendas)
    .where(and(gte(lojaVendas.criadoEm, new Date(inicioMes)), inArray(lojaVendas.status, ["aprovada", "aguardando_pagamento", "pagamento_parcial", "pago", "preparando_entrega", "entregue", "concluida"] as never[])));

  const [{ orcamentosAbertos }] = await db
    .select({ orcamentosAbertos: count() })
    .from(lojaOrcamentos)
    .where(inArray(lojaOrcamentos.status, ["rascunho", "enviado", "pendente"] as never[]));

  const [{ aguardandoAprovacao }] = await db
    .select({ aguardandoAprovacao: count() })
    .from(lojaOrcamentos)
    .where(eq(lojaOrcamentos.status, "aguardando_aprovacao" as never));

  const [{ vendasAndamento }] = await db
    .select({ vendasAndamento: count() })
    .from(lojaVendas)
    .where(inArray(lojaVendas.status, ["aprovada", "aguardando_pagamento", "pagamento_parcial", "preparando_entrega"] as never[]));

  const [{ entregasPendentes }] = await db
    .select({ entregasPendentes: count() })
    .from(lojaEntregas)
    .where(inArray(lojaEntregas.status, ["pendente", "preparando", "em_transporte"] as never[]));

  const [{ estoqueBaixo }] = await db
    .select({ estoqueBaixo: count() })
    .from(lojaProdutos)
    .where(sql`${lojaProdutos.estoque} <= ${lojaProdutos.estoqueMinimo} and ${lojaProdutos.estoqueMinimo} > 0`);

  const [{ comprasPendentes }] = await db
    .select({ comprasPendentes: count() })
    .from(lojaCompras)
    .where(inArray(lojaCompras.status, ["rascunho", "aguardando_envio", "pedido_enviado", "aguardando_fornecedor", "confirmado", "em_transporte"] as never[]));

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <div>
        <h1 className="font-display text-headline-lg font-bold text-primary">Loja Sparapan</h1>
        <p className="text-body-md text-on-surface-variant">
          Operação independente para venda de embarcações, motores, equipamentos e acessórios — integrada a clientes, financeiro, arquivos e Central de Operações.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Vendas do mês" value={formatarMoeda(vendasMes?.total ?? 0)} />
        <StatCard icon={Receipt} label="Orçamentos em aberto" value={orcamentosAbertos} tone="info" />
        <StatCard icon={Receipt} label="Aguardando aprovação" value={aguardandoAprovacao} tone="warning" />
        <StatCard icon={ShoppingBag} label="Vendas em andamento" value={vendasAndamento} tone="info" />
        <StatCard icon={Truck} label="Entregas pendentes" value={entregasPendentes} tone="warning" />
        <StatCard icon={Boxes} label="Estoque baixo" value={estoqueBaixo} tone="danger" />
        <StatCard icon={ClipboardList} label="Compras pendentes" value={comprasPendentes} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
        {CARTOES.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="rounded-pill bg-primary-container p-2.5 text-on-primary-container">
              <c.icon size={22} />
            </span>
            <div>
              <h2 className="font-display text-title-md font-semibold text-primary">{c.title}</h2>
              <p className="text-body-sm text-on-surface-variant">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
