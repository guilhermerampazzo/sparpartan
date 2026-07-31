import { db } from "@/db";
import { clientes, lojaProdutos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NovoOrcamentoLojaForm } from "./form";

export default async function NovoOrcamentoLojaPage({
  searchParams,
}: {
  searchParams: Promise<{ produtoId?: string }>;
}) {
  const { produtoId } = await searchParams;

  const listaClientes = await db.select({ id: clientes.id, nome: clientes.nome }).from(clientes).orderBy(clientes.nome);
  const listaProdutos = await db
    .select({ id: lojaProdutos.id, nome: lojaProdutos.nome, preco: lojaProdutos.preco })
    .from(lojaProdutos)
    .where(eq(lojaProdutos.ativo, true))
    .orderBy(lojaProdutos.nome);

  const produtoInicial = produtoId ? listaProdutos.find((p) => p.id === produtoId) : undefined;

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Orçamento</h1>
      <NovoOrcamentoLojaForm listaClientes={listaClientes} listaProdutos={listaProdutos} produtoInicial={produtoInicial} />
    </div>
  );
}
