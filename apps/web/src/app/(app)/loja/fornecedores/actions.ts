"use server";

import { desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lojaCompras, lojaCompraItens, lojaFornecedores, lojaProdutos, lojaProdutoFornecedores } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";

function opt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

export async function criarFornecedor(formData: FormData) {
  const razaoSocial = String(formData.get("razaoSocial") ?? "").trim();
  if (!razaoSocial) throw new Error("Informe a razão social do fornecedor.");

  const [criado] = await db
    .insert(lojaFornecedores)
    .values({
      razaoSocial,
      nomeFantasia: opt(formData, "nomeFantasia"),
      cnpj: opt(formData, "cnpj"),
      telefone: opt(formData, "telefone"),
      whatsapp: opt(formData, "whatsapp"),
      email: opt(formData, "email"),
      endereco: opt(formData, "endereco"),
      cidade: opt(formData, "cidade"),
      contatoResponsavel: opt(formData, "contatoResponsavel"),
      observacoes: opt(formData, "observacoes"),
      condicoesPagamento: opt(formData, "condicoesPagamento"),
      prazoMedioEntrega: opt(formData, "prazoMedioEntrega"),
    })
    .returning({ id: lojaFornecedores.id });

  await registrarAuditoria("criar", "loja_fornecedor", criado.id, razaoSocial);
  redirect(`/loja/fornecedores/${criado.id}`);
}

export async function atualizarFornecedor(id: string, formData: FormData) {
  await db
    .update(lojaFornecedores)
    .set({
      razaoSocial: String(formData.get("razaoSocial") ?? "").trim(),
      nomeFantasia: opt(formData, "nomeFantasia"),
      cnpj: opt(formData, "cnpj"),
      telefone: opt(formData, "telefone"),
      whatsapp: opt(formData, "whatsapp"),
      email: opt(formData, "email"),
      endereco: opt(formData, "endereco"),
      cidade: opt(formData, "cidade"),
      contatoResponsavel: opt(formData, "contatoResponsavel"),
      observacoes: opt(formData, "observacoes"),
      condicoesPagamento: opt(formData, "condicoesPagamento"),
      prazoMedioEntrega: opt(formData, "prazoMedioEntrega"),
    })
    .where(eq(lojaFornecedores.id, id));
  await registrarAuditoria("atualizar", "loja_fornecedor", id, "dados do fornecedor");
  revalidatePath(`/loja/fornecedores/${id}`);
  redirect(`/loja/fornecedores/${id}`);
}

export async function excluirFornecedor(id: string) {
  await db.delete(lojaFornecedores).where(eq(lojaFornecedores.id, id));
  await registrarAuditoria("excluir", "loja_fornecedor", id, "fornecedor excluído");
  redirect("/loja/fornecedores");
}

/** Vincula um produto a este fornecedor (preço, prazo, condição, preferencial). */
export async function adicionarProdutoFornecedor(fornecedorId: string, formData: FormData) {
  const produtoId = String(formData.get("produtoId") ?? "").trim();
  if (!produtoId) throw new Error("Selecione o produto.");

  await db.insert(lojaProdutoFornecedores).values({
    produtoId,
    fornecedorId,
    preco: String(formData.get("preco") ?? "0").trim() || "0",
    prazoEntrega: opt(formData, "prazoEntrega"),
    condicaoPagamento: opt(formData, "condicaoPagamento"),
    preferencial: formData.get("preferencial") === "on",
  });
  await registrarAuditoria("criar", "loja_produto_fornecedor", fornecedorId, `produto vinculado: ${produtoId}`);
  revalidatePath(`/loja/fornecedores/${fornecedorId}`);
}

export async function removerProdutoFornecedor(fornecedorId: string, vinculoId: string) {
  await db.delete(lojaProdutoFornecedores).where(eq(lojaProdutoFornecedores.id, vinculoId));
  await registrarAuditoria("excluir", "loja_produto_fornecedor", vinculoId, "vínculo removido");
  revalidatePath(`/loja/fornecedores/${fornecedorId}`);
}

export type HistoricoComprasFornecedor = {
  pedidos: Array<{
    id: string;
    numero: string;
    criadoEm: string;
    status: string;
    totalItens: number;
    totalValor: string;
  }>;
  resumoPorProduto: Array<{
    produtoId: string;
    descricao: string;
    quantidadeTotal: number;
    ultimoPreco: string;
    ultimaData: string;
    quantidadePendente: number;
  }>;
  totais: {
    pedidosRealizados: number;
    pedidosPendentes: number;
    valorTotalCompras: string;
  };
};

/** Histórico de compras (pedidos de compra) de um fornecedor. */
export async function buscarHistoricoComprasFornecedor(fornecedorId: string): Promise<HistoricoComprasFornecedor> {
  const pedidos = await db
    .select({
      id: lojaCompras.id,
      numero: lojaCompras.numero,
      criadoEm: lojaCompras.criadoEm,
      status: lojaCompras.status,
    })
    .from(lojaCompras)
    .where(eq(lojaCompras.fornecedorId, fornecedorId))
    .orderBy(desc(lojaCompras.criadoEm));

  const comprasIds = pedidos.map((p) => p.id);

  const agregadosPorCompra = comprasIds.length
    ? await db
        .select({
          compraId: lojaCompraItens.compraId,
          totalItens: sql<number>`count(*)::int`,
          totalValor: sql<string>`coalesce(sum(${lojaCompraItens.precoUnitario} * ${lojaCompraItens.quantidade}), 0)`,
        })
        .from(lojaCompraItens)
        .where(inArray(lojaCompraItens.compraId, comprasIds))
        .groupBy(lojaCompraItens.compraId)
    : [];
  const porCompra = new Map(agregadosPorCompra.map((a) => [a.compraId, a]));

  const resumoPorProduto = await db
    .select({
      produtoId: lojaCompraItens.produtoId,
      descricao: lojaProdutos.nome,
      quantidadeTotal: sql<number>`sum(${lojaCompraItens.quantidade})::int`,
      ultimoPreco: sql<string>`(array_agg(${lojaCompraItens.precoUnitario} order by ${lojaCompras.criadoEm} desc))[1]`,
      ultimaData: sql<Date>`max(${lojaCompras.criadoEm})`,
      quantidadePendente: sql<number>`sum(${lojaCompraItens.quantidade} - ${lojaCompraItens.quantidadeRecebida})::int`,
    })
    .from(lojaCompraItens)
    .innerJoin(lojaCompras, eq(lojaCompraItens.compraId, lojaCompras.id))
    .innerJoin(lojaProdutos, eq(lojaCompraItens.produtoId, lojaProdutos.id))
    .where(eq(lojaCompras.fornecedorId, fornecedorId))
    .groupBy(lojaCompraItens.produtoId, lojaProdutos.nome)
    .orderBy(lojaProdutos.nome);

  const statusFinalizados = ["finalizado", "cancelado"];

  return {
    pedidos: pedidos.map((p) => ({
      id: p.id,
      numero: p.numero,
      criadoEm: (p.criadoEm instanceof Date ? p.criadoEm : new Date(p.criadoEm)).toISOString(),
      status: p.status,
      totalItens: porCompra.get(p.id)?.totalItens ?? 0,
      totalValor: porCompra.get(p.id)?.totalValor ?? "0",
    })),
    resumoPorProduto: resumoPorProduto.map((r) => ({
      produtoId: r.produtoId,
      descricao: r.descricao,
      quantidadeTotal: r.quantidadeTotal,
      ultimoPreco: r.ultimoPreco ?? "0",
      ultimaData: r.ultimaData ? (r.ultimaData instanceof Date ? r.ultimaData : new Date(r.ultimaData)).toISOString() : "",
      quantidadePendente: r.quantidadePendente,
    })),
    totais: {
      pedidosRealizados: pedidos.length,
      pedidosPendentes: pedidos.filter((p) => !statusFinalizados.includes(p.status)).length,
      valorTotalCompras: agregadosPorCompra.reduce((acc, a) => acc + Number(a.totalValor), 0).toFixed(2),
    },
  };
}
