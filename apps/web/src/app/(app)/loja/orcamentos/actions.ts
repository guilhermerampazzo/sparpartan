"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  lojaOrcamentos,
  lojaOrcamentoItens,
  lojaVendas,
  lojaVendaItens,
  lojaProdutos,
  clientes,
} from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

const MAX_ITENS = 8;

async function proximoNumeroOrcamentoLoja(): Promise<string> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(lojaOrcamentos);
  return `LJ-${String(n + 1).padStart(4, "0")}`;
}

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

  const valorTotal = somarTotal(itens);

  // proximoNumeroOrcamentoLoja faz count+1 sem lock — dois orçamentos criados no
  // mesmo instante podem colidir no UNIQUE de numero. Tenta de novo com número recalculado.
  const MAX_TENTATIVAS = 5;
  let orcamentoId: string | undefined;
  let numero = "";
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    numero = await proximoNumeroOrcamentoLoja();
    try {
      const [orcamento] = await db
        .insert(lojaOrcamentos)
        .values({
          numero,
          clienteId,
          valorTotal,
          observacoes: String(formData.get("observacoes") ?? "") || null,
        })
        .returning({ id: lojaOrcamentos.id });
      orcamentoId = orcamento.id;
      break;
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      if (!mensagem.includes("loja_orcamentos_numero_unique") || tentativa === MAX_TENTATIVAS - 1) {
        throw e;
      }
    }
  }

  if (!orcamentoId) {
    throw new Error("Não foi possível criar o orçamento da loja.");
  }

  for (const item of itens) {
    await db.insert(lojaOrcamentoItens).values({ orcamentoId, ...item });
  }

  await registrarAuditoria("criar", "loja_orcamento", orcamentoId, numero);
  redirect(`/loja/orcamentos/${orcamentoId}`);
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
  if (orcamento.status === "convertido") throw new Error("Este orçamento já foi convertido em venda.");

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
      vendedorId: orcamento.vendedorId ?? (await idUsuarioEquipe()),
      formaPagamento: orcamento.formaPagamento,
      frete: orcamento.frete,
      status: "aprovada",
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

  await db.update(lojaOrcamentos).set({ status: "convertido" }).where(eq(lojaOrcamentos.id, orcamentoId));
  await registrarAuditoria("criar", "loja_venda", venda.id, `convertida do orçamento ${orcamento.numero}`);
  redirect(`/loja/vendas/${venda.id}`);
}

/** Avança o orçamento: rascunho → enviado → aguardando aprovação. */
export async function avancarOrcamentoLoja(orcamentoId: string, formData: FormData) {
  const proximo = String(formData.get("proximo") ?? "");
  if (!["enviado", "aguardando_aprovacao", "aprovado"].includes(proximo)) throw new Error("Transição inválida.");

  await db.update(lojaOrcamentos).set({ status: proximo as never }).where(eq(lojaOrcamentos.id, orcamentoId));
  await registrarAuditoria("atualizar", "loja_orcamento", orcamentoId, `status → ${proximo}`);
  redirect(`/loja/orcamentos/${orcamentoId}`);
}

/**
 * Finaliza o carrinho da Loja: cria o orçamento (rascunho) com vendedor =
 * usuário logado, desconto/frete/validade/forma de pagamento. Se o cliente não
 * existir, faz o cadastro rápido inline (mesmo cadastro principal — sem duplicidade).
 */
export async function finalizarOrcamentoCarrinho(formData: FormData) {
  const itensJson = String(formData.get("itens") ?? "[]");
  let itens: { produtoId: string; nome: string; preco: string; quantidade: number }[];
  try {
    itens = JSON.parse(itensJson) as typeof itens;
  } catch {
    throw new Error("Carrinho inválido.");
  }
  if (itens.length === 0) throw new Error("Carrinho vazio.");

  let clienteId = String(formData.get("clienteId") ?? "").trim();
  if (!clienteId) {
    // Cadastro rápido inline — mesmo cadastro de clientes do sistema.
    const nome = String(formData.get("nome") ?? "").trim();
    if (!nome) throw new Error("Informe o nome do cliente.");
    const cpfCnpj = String(formData.get("cpfCnpj") ?? "").trim();
    const { randomUUID } = await import("node:crypto");
    const [cliente] = await db
      .insert(clientes)
      .values({
        nome,
        // cpf_cnpj é NOT NULL — placeholder único quando o cliente não informa
        cpfCnpj: cpfCnpj || `loja-${randomUUID()}`,
        email: String(formData.get("email") ?? "").trim() || null,
        telefone: String(formData.get("telefone") ?? "").trim() || null,
        celular: String(formData.get("celular") ?? "").trim() || null,
        classificacao: "cliente",
      })
      .returning({ id: clientes.id });
    clienteId = cliente.id;
    await registrarAuditoria("criar", "cliente", clienteId, `cadastro rápido pela Loja: ${nome}`);
  }

  const desconto = Number(String(formData.get("desconto") ?? "0").replace(",", ".")) || 0;
  const frete = Number(String(formData.get("frete") ?? "0").replace(",", ".")) || 0;
  const subtotal = itens.reduce((acc, i) => acc + i.quantidade * Number(i.preco), 0);
  const valorTotal = Math.max(0, subtotal - desconto) + frete;

  const numero = await proximoNumeroOrcamentoLoja();
  const [orcamento] = await db
    .insert(lojaOrcamentos)
    .values({
      numero,
      clienteId,
      valorTotal: valorTotal.toFixed(2),
      status: "rascunho",
      observacoes: String(formData.get("observacoes") ?? "") || null,
      vendedorId: await idUsuarioEquipe(),
      validade: String(formData.get("validade") ?? "") || null,
      desconto: desconto.toFixed(2),
      frete: frete.toFixed(2),
      formaPagamento: String(formData.get("formaPagamento") ?? "") || null,
    })
    .returning({ id: lojaOrcamentos.id });

  for (const item of itens) {
    await db.insert(lojaOrcamentoItens).values({
      orcamentoId: orcamento.id,
      produtoId: item.produtoId,
      descricao: item.nome,
      quantidade: item.quantidade,
      precoUnitario: item.preco,
    });
  }

  await registrarAuditoria("criar", "loja_orcamento", orcamento.id, `${numero} (carrinho)`);
  redirect(`/loja/orcamentos/${orcamento.id}`);
}
