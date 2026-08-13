"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { lojaProdutos, lojaProdutoFotos, lojaProdutoArquivos } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";
import { validarArquivo } from "@/lib/upload";
import type { LojaCategoria } from "@/lib/loja";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

function opt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

export async function criarProdutoLoja(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome do produto.")
    .exigir(!!categoria, "Selecione a categoria.").erro;

  if (erro) return { erro, valores };

  const [produto] = await db
    .insert(lojaProdutos)
    .values({
      nome,
      categoria: categoria as LojaCategoria,
      descricao: opt(formData, "descricao"),
      fabricante: opt(formData, "fabricante"),
      preco: opt(formData, "preco"),
      estoque: Number(opt(formData, "estoque") ?? "0") || 0,
      observacoes: opt(formData, "observacoes"),
      marca: opt(formData, "marca"),
      modelo: opt(formData, "modelo"),
      sku: opt(formData, "sku"),
      fichaTecnica: opt(formData, "fichaTecnica"),
      unidade: opt(formData, "unidade") ?? "un",
      disponibilidade: opt(formData, "disponibilidade") ?? "estoque",
      custo: opt(formData, "custo"),
      descontoMaximo: opt(formData, "descontoMaximo") ?? "0",
      precoPromocional: opt(formData, "precoPromocional"),
      estoqueMinimo: Number(opt(formData, "estoqueMinimo") ?? "0") || 0,
      numeroSerie: opt(formData, "numeroSerie"),
      anoFabricacao: opt(formData, "anoFabricacao"),
      potencia: opt(formData, "potencia"),
      caracteristicasTecnicas: opt(formData, "caracteristicasTecnicas"),
      ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    })
    .returning({ id: lojaProdutos.id });

  await registrarAuditoria("criar", "loja_produto", produto.id, nome);
  redirect(`/loja/catalogo/${produto.id}`);
}

export async function atualizarProdutoLoja(
  produtoId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome do produto.")
    .exigir(!!categoria, "Selecione a categoria.").erro;

  if (erro) return { erro, valores };

  await db
    .update(lojaProdutos)
    .set({
      nome,
      categoria: categoria as LojaCategoria,
      descricao: opt(formData, "descricao"),
      fabricante: opt(formData, "fabricante"),
      preco: opt(formData, "preco"),
      estoque: Number(opt(formData, "estoque") ?? "0") || 0,
      observacoes: opt(formData, "observacoes"),
      marca: opt(formData, "marca"),
      modelo: opt(formData, "modelo"),
      sku: opt(formData, "sku"),
      fichaTecnica: opt(formData, "fichaTecnica"),
      unidade: opt(formData, "unidade") ?? "un",
      disponibilidade: opt(formData, "disponibilidade") ?? "estoque",
      custo: opt(formData, "custo"),
      descontoMaximo: opt(formData, "descontoMaximo") ?? "0",
      precoPromocional: opt(formData, "precoPromocional"),
      estoqueMinimo: Number(opt(formData, "estoqueMinimo") ?? "0") || 0,
      numeroSerie: opt(formData, "numeroSerie"),
      anoFabricacao: opt(formData, "anoFabricacao"),
      potencia: opt(formData, "potencia"),
      caracteristicasTecnicas: opt(formData, "caracteristicasTecnicas"),
      ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    })
    .where(eq(lojaProdutos.id, produtoId));

  await registrarAuditoria("atualizar", "loja_produto", produtoId, nome);
  revalidatePath(`/loja/catalogo/${produtoId}`);
  redirect(`/loja/catalogo/${produtoId}`);
}

export async function excluirProdutoLoja(produtoId: string) {
  await db.update(lojaProdutos).set({ ativo: false }).where(eq(lojaProdutos.id, produtoId));
  await registrarAuditoria("excluir", "loja_produto", produtoId, "");
  redirect("/loja/catalogo");
}

export async function enviarFotoProdutoLoja(produtoId: string, formData: FormData) {
  const arquivo = formData.get("foto") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione uma foto.");

  const erroArquivo = validarArquivo(arquivo, "imagem");
  if (erroArquivo) throw new Error(erroArquivo);

  const dir = path.join(uploadsDir(), "loja", "produtos", produtoId);
  await mkdir(dir, { recursive: true });

  const extensao = path.extname(arquivo.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(dir, nomeArquivo), bytes);

  await db.insert(lojaProdutoFotos).values({
    produtoId,
    caminho: path.join("loja", "produtos", produtoId, nomeArquivo),
  });

  revalidatePath(`/loja/catalogo/${produtoId}`);
}

export async function removerFotoProdutoLoja(produtoId: string, fotoId: string) {
  const [foto] = await db
    .select()
    .from(lojaProdutoFotos)
    .where(eq(lojaProdutoFotos.id, fotoId))
    .limit(1);
  if (foto) {
    await unlink(path.join(uploadsDir(), foto.caminho)).catch(() => {});
    await db.delete(lojaProdutoFotos).where(eq(lojaProdutoFotos.id, fotoId));
  }
  revalidatePath(`/loja/catalogo/${produtoId}`);
}

export async function enviarArquivoProdutoLoja(produtoId: string, formData: FormData) {
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione um arquivo.");

  const erroArquivo = validarArquivo(arquivo, "documento");
  if (erroArquivo) throw new Error(erroArquivo);

  const dir = path.join(uploadsDir(), "loja", "produtos", produtoId, "arquivos");
  await mkdir(dir, { recursive: true });

  const extensao = path.extname(arquivo.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(dir, nomeArquivo), bytes);

  await db.insert(lojaProdutoArquivos).values({
    produtoId,
    nomeOriginal: arquivo.name,
    caminho: path.join("loja", "produtos", produtoId, "arquivos", nomeArquivo),
  });

  revalidatePath(`/loja/catalogo/${produtoId}`);
}

export async function removerArquivoProdutoLoja(produtoId: string, arquivoId: string) {
  const [arquivo] = await db
    .select()
    .from(lojaProdutoArquivos)
    .where(eq(lojaProdutoArquivos.id, arquivoId))
    .limit(1);
  if (arquivo) {
    await unlink(path.join(uploadsDir(), arquivo.caminho)).catch(() => {});
    await db.delete(lojaProdutoArquivos).where(eq(lojaProdutoArquivos.id, arquivoId));
  }
  revalidatePath(`/loja/catalogo/${produtoId}`);
}
