import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { lojaProdutos, lojaProdutoFornecedores, lojaFornecedores } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { NovoPedidoCompra } from "./novo-pedido";

export default async function NovoPedidoCompraPage() {
  const produtos = await db
    .select()
    .from(lojaProdutos)
    .where(eq(lojaProdutos.ativo, true))
    .orderBy(asc(lojaProdutos.nome));

  const vinculos = await db
    .select({
      id: lojaProdutoFornecedores.id,
      produtoId: lojaProdutoFornecedores.produtoId,
      fornecedorId: lojaProdutoFornecedores.fornecedorId,
      preco: lojaProdutoFornecedores.preco,
      prazoEntrega: lojaProdutoFornecedores.prazoEntrega,
      condicaoPagamento: lojaProdutoFornecedores.condicaoPagamento,
      preferencial: lojaProdutoFornecedores.preferencial,
      fornecedorNome: lojaFornecedores.razaoSocial,
    })
    .from(lojaProdutoFornecedores)
    .innerJoin(lojaFornecedores, eq(lojaProdutoFornecedores.fornecedorId, lojaFornecedores.id));

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja/compras" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Pedido de Compra</h1>
      <p className="max-w-2xl text-body-sm text-outline">
        Informe apenas o produto e a quantidade necessária — o sistema identifica automaticamente os
        fornecedores e separa os pedidos por fornecedor.
      </p>
      <NovoPedidoCompra produtos={produtos} vinculos={vinculos} />
    </div>
  );
}
