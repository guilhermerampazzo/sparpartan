"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lojaCompras, lojaCompraItens, lojaProdutos, lojaProdutoFornecedores, lojaFornecedores } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { enviarEmail } from "@/lib/mail/adapter";
import { gerarHtmlPedidoCompra } from "@/lib/loja-pdf";
import { idUsuarioEquipe } from "@/lib/sessao";

async function proximoNumeroCompra(): Promise<string> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(lojaCompras);
  return `PC-${String(n + 1).padStart(4, "0")}`;
}

/**
 * Compras inteligentes: o usuário informa apenas produto + quantidade; o sistema
 * identifica automaticamente o fornecedor de cada produto (via produtos fornecidos).
 * Se houver mais de um, o usuário escolhe (campo `fornecedor_<produtoId>`).
 * Os pedidos são separados automaticamente por fornecedor.
 */
export async function criarComprasInteligentes(formData: FormData) {
  const itensJson = String(formData.get("itens") ?? "[]");
  let solicitados: { produtoId: string; quantidade: number }[];
  try {
    solicitados = JSON.parse(itensJson) as typeof solicitados;
  } catch {
    throw new Error("Lista de compra inválida.");
  }
  const validos = solicitados.filter((i) => i.produtoId && i.quantidade > 0);
  if (validos.length === 0) throw new Error("Informe ao menos um produto com quantidade.");

  // Busca fornecedores de cada produto (preço, prazo, preferencial).
  const produtosIds = validos.map((i) => i.produtoId);
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
    .innerJoin(lojaFornecedores, eq(lojaProdutoFornecedores.fornecedorId, lojaFornecedores.id))
    .where(inArray(lojaProdutoFornecedores.produtoId, produtosIds));

  const produtos = await db
    .select({ id: lojaProdutos.id, nome: lojaProdutos.nome })
    .from(lojaProdutos)
    .where(inArray(lojaProdutos.id, produtosIds));
  const nomeProduto = new Map(produtos.map((p) => [p.id, p.nome]));

  // Agrupa por fornecedor: produto → fornecedor escolhido (ou único; ou o usuário decide).
  const pedidos = new Map<string, { produtoId: string; quantidade: number; preco: string }[]>();
  const semFornecedor: string[] = [];

  for (const item of validos) {
    const opcoes = vinculos.filter((v) => v.produtoId === item.produtoId);
    if (opcoes.length === 0) {
      semFornecedor.push(nomeProduto.get(item.produtoId) ?? item.produtoId);
      continue;
    }
    let escolhido = opcoes[0];
    if (opcoes.length > 1) {
      const escolha = String(formData.get(`fornecedor_${item.produtoId}`) ?? "");
      const manual = opcoes.find((o) => o.fornecedorId === escolha);
      if (manual) escolhido = manual;
    }
    const lista = pedidos.get(escolhido.fornecedorId) ?? [];
    lista.push({ produtoId: item.produtoId, quantidade: item.quantidade, preco: escolhido.preco });
    pedidos.set(escolhido.fornecedorId, lista);
  }

  if (pedidos.size === 0) throw new Error("Nenhum fornecedor encontrado para os produtos selecionados.");

  const numeroBase = await proximoNumeroCompra();
  let indice = 0;
  for (const [fornecedorId, itens] of pedidos) {
    indice++;
    const numero = pedidos.size > 1 ? `${numeroBase}-${indice}` : numeroBase;
    const [compra] = await db
      .insert(lojaCompras)
      .values({
        numero,
        fornecedorId,
        status: "rascunho",
        observacoes: semFornecedor.length > 0 ? `Sem fornecedor: ${semFornecedor.join(", ")}` : null,
        criadoPorId: await idUsuarioEquipe(),
      })
      .returning({ id: lojaCompras.id });

    for (const item of itens) {
      await db.insert(lojaCompraItens).values({
        compraId: compra.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.preco,
      });
    }
    await registrarAuditoria("criar", "loja_compra", compra.id, `${numero} — ${itens.length} item(ns)`);
  }

  revalidatePath("/loja/compras");
  redirect(pedidos.size === 1 ? `/loja/compras/${[...pedidos.keys()][0]}` : "/loja/compras?criadas=1");
}

export async function avancarStatusCompra(compraId: string, formData: FormData) {
  const proximo = String(formData.get("proximo") ?? "");
  await db.update(lojaCompras).set({ status: proximo as never }).where(eq(lojaCompras.id, compraId));
  await registrarAuditoria("atualizar", "loja_compra", compraId, `status → ${proximo}`);
  revalidatePath(`/loja/compras/${compraId}`);
}

/** Registra o recebimento parcial/total: estoque +recebida; finaliza quando completo. */
export async function registrarRecebimentoCompra(compraId: string, formData: FormData) {
  const itens = await db.select().from(lojaCompraItens).where(eq(lojaCompraItens.compraId, compraId));
  let totalPendente = 0;

  for (const item of itens) {
    const recebida = Number(formData.get(`recebida_${item.id}`) ?? "0") || 0;
    if (recebida <= 0) continue;
    const novaQtd = Math.min(item.quantidade, item.quantidadeRecebida + recebida);
    await db
      .update(lojaCompraItens)
      .set({ quantidadeRecebida: novaQtd })
      .where(eq(lojaCompraItens.id, item.id));

    // Estoque atualizado automaticamente ao receber
    const [produto] = await db.select({ estoque: lojaProdutos.estoque }).from(lojaProdutos).where(eq(lojaProdutos.id, item.produtoId)).limit(1);
    if (produto) {
      await db
        .update(lojaProdutos)
        .set({ estoque: produto.estoque + (novaQtd - item.quantidadeRecebida) })
        .where(eq(lojaProdutos.id, item.produtoId));
    }
  }

  const atualizados = await db.select().from(lojaCompraItens).where(eq(lojaCompraItens.compraId, compraId));
  totalPendente = atualizados.reduce((acc, i) => acc + (i.quantidade - i.quantidadeRecebida), 0);
  const status: "recebido" | "finalizado" = totalPendente === 0 ? "finalizado" : "recebido";

  await db.update(lojaCompras).set({ status }).where(eq(lojaCompras.id, compraId));
  await registrarAuditoria(
    "atualizar",
    "loja_compra",
    compraId,
    totalPendente === 0 ? "recebimento completo — estoque atualizado" : `recebimento parcial — faltam ${totalPendente} item(ns)`
  );
  revalidatePath(`/loja/compras/${compraId}`);
}

export async function excluirCompra(compraId: string) {
  await db.delete(lojaCompras).where(eq(lojaCompras.id, compraId));
  await registrarAuditoria("excluir", "loja_compra", compraId, "compra excluída");
  redirect("/loja/compras");
}

/** Envia o pedido de compra por e-mail ao fornecedor (com o HTML do pedido). */
export async function enviarPedidoCompraEmail(compraId: string) {
  const [compra] = await db.select().from(lojaCompras).where(eq(lojaCompras.id, compraId)).limit(1);
  if (!compra) throw new Error("Pedido de compra não encontrado");

  const [fornecedor] = await db.select().from(lojaFornecedores).where(eq(lojaFornecedores.id, compra.fornecedorId)).limit(1);
  if (!fornecedor?.email) throw new Error("Fornecedor sem e-mail cadastrado");

  const html = await gerarHtmlPedidoCompra(compraId);

  try {
    await enviarEmail({
      to: fornecedor.email,
      subject: `Pedido de Compra ${compra.numero} — Sparapan`,
      html,
    });
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Falha ao enviar e-mail do pedido de compra");
  }

  await registrarAuditoria("enviar", "loja_compra", compraId, `pedido enviado por e-mail para ${fornecedor.email}`);
  revalidatePath("/loja/compras");
  revalidatePath(`/loja/compras/${compraId}`);
}
