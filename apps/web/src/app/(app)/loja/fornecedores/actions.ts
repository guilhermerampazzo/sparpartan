"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lojaFornecedores, lojaProdutoFornecedores } from "@/db/schema";
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
