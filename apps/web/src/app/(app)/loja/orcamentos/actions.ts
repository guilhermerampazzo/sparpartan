"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  lojaOrcamentos,
  lojaOrcamentoItens,
  lojaVendas,
  lojaVendaItens,
  lojaProdutos,
} from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";
import { proximoNumeroOrcamentoLoja } from "@/lib/loja";

const MAX_ITENS = 8;

function coletarItens(formData: FormData) {
  const itens: { produtoId: string | null; descricao: string; quantidade: number; precoUnitario: string }[] = [];
  for (let i = 0; i < MAX_ITENS; i++) {
    const descricao = String(formData.get(`item${i}Descricao`) ?? "").trim();
    if (!descricao) continue;
    const quantidade = Number(formData.get(`item${i}Quantidade`) ?? "1") || 1;
    const precoUnitario = String(formData.get(`item${i}Preco`) ?? "0") || "0";
    const produtoId = String(formData.get(`item${i}ProdutoId`) ?? "").trim() || null;
    itens.push({ produtoId, descricao, quantidade, precoUnitario });
  }
  return itens;
}

function somarTotal(itens: { quantidade: number; precoUnitario: string }[]) {
  return itens.reduce((acc, i) => acc + i.quantidade * Number(i.precoUnitario), 0).toFixed(2);
}

export async function criarOrcamentoLoja(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const clienteId = String(formData.get("clienteId") ?? "").trim();
  const valores = valoresDoFormData(formData);
  const itens = coletarItens(formData);

  const erro = new Validador()
    .exigir(!!clienteId, "Selecione o cliente.")
    .exigir(itens.length > 0, "Adicione ao menos um item.").erro;

  if (erro) return { erro, valores };

  const numero = await proximoNumeroOrcamentoLoja();
  const valorTotal = somarTotal(itens);

  const [orcamento] = await db
    .insert(lojaOrcamentos)
    .values({
      numero,
      clienteId,
      valorTotal,
      observacoes: String(formData.get("observacoes") ?? "") || null,
    })
    .returning({ id: lojaOrcamentos.id });

  for (const item of itens) {
    await db.insert(lojaOrcamentoItens).values({ orcamentoId: orcamento.id, ...item });
  }

  await registrarAuditoria("criar", "loja_orcamento", orcamento.id, numero);
  redirect(`/loja/orcamentos/${orcamento.id}`);
}

export async function recusarOrcamentoLoja(orcamentoId: string) {
  await db.update(lojaOrcamentos).set({ status: "recusado" }).where(eq(lojaOrcamentos.id, orcamentoId));
  await registrarAuditoria("atualizar", "loja_orcamento", orcamentoId, "recusado");
  redirect(`/loja/orcamentos/${orcamentoId}`);
}

/** Aprova o orçamento e converte automaticamente em venda, com os mesmos itens/cliente. */
export async function aprovarOrcamentoLoja(orcamentoId: string) {
  const [orcamento] = await db
    .select()
    .from(lojaOrcamentos)
    .where(eq(lojaOrcamentos.id, orcamentoId))
    .limit(1);
  if (!orcamento) throw new Error("Orçamento não encontrado.");
  if (orcamento.status !== "pendente") throw new Error("Só é possível aprovar orçamentos pendentes.");

  const itens = await db
    .select()
    .from(lojaOrcamentoItens)
    .where(eq(lojaOrcamentoItens.orcamentoId, orcamentoId));

  const [venda] = await db
    .insert(lojaVendas)
    .values({
      orcamentoId,
      clienteId: orcamento.clienteId,
      valorTotal: orcamento.valorTotal,
      observacoes: orcamento.observacoes,
    })
    .returning({ id: lojaVendas.id });

  for (const item of itens) {
    await db.insert(lojaVendaItens).values({
      vendaId: venda.id,
      produtoId: item.produtoId,
      descricao: item.descricao,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
    });
    if (item.produtoId) {
      const [produto] = await db
        .select({ estoque: lojaProdutos.estoque })
        .from(lojaProdutos)
        .where(eq(lojaProdutos.id, item.produtoId))
        .limit(1);
      if (produto) {
        await db
          .update(lojaProdutos)
          .set({ estoque: Math.max(0, produto.estoque - item.quantidade) })
          .where(eq(lojaProdutos.id, item.produtoId));
      }
    }
  }

  await db.update(lojaOrcamentos).set({ status: "aprovado" }).where(eq(lojaOrcamentos.id, orcamentoId));
  await registrarAuditoria("criar", "loja_venda", venda.id, `convertida do orçamento ${orcamento.numero}`);
  redirect(`/loja/vendas/${venda.id}`);
}
