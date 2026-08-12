"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  lojaVendas,
  lojaVendaPagamentos,
  lojaVendaChecklistItens,
  lojaVendaDocumentos,
  lojaEntregas,
} from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { validarArquivo } from "@/lib/upload";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

export async function atualizarStatusVenda(vendaId: string, formData: FormData) {
  const status = String(formData.get("status") ?? "") as "em_andamento" | "concluida" | "cancelada";
  await db.update(lojaVendas).set({ status }).where(eq(lojaVendas.id, vendaId));
  await registrarAuditoria("atualizar", "loja_venda", vendaId, `status: ${status}`);
  revalidatePath(`/loja/vendas/${vendaId}`);
}

export async function atualizarFinanceiroVenda(vendaId: string, formData: FormData) {
  const custoTotal = String(formData.get("custoTotal") ?? "").trim() || null;
  const comissao = String(formData.get("comissao") ?? "").trim() || null;
  await db.update(lojaVendas).set({ custoTotal, comissao }).where(eq(lojaVendas.id, vendaId));
  await registrarAuditoria("atualizar", "loja_venda", vendaId, `custo/comissão: ${custoTotal ?? "—"} / ${comissao ?? "—"}`);
  revalidatePath(`/loja/vendas/${vendaId}`);
}

export async function adicionarPagamentoVenda(vendaId: string, formData: FormData) {
  const valor = String(formData.get("valor") ?? "").trim();
  if (!valor || Number(valor) <= 0) throw new Error("Informe um valor válido.");

  await db.insert(lojaVendaPagamentos).values({
    vendaId,
    valor,
    formaPagamento: String(formData.get("formaPagamento") ?? "") || null,
    dataPagamento: String(formData.get("dataPagamento") ?? "") || null,
  });
  await registrarAuditoria("criar", "loja_venda_pagamento", vendaId, valor);
  revalidatePath(`/loja/vendas/${vendaId}`);
}

export async function adicionarChecklistVenda(vendaId: string, formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  if (!descricao) throw new Error("Informe a descrição do item.");
  const [item] = await db
    .insert(lojaVendaChecklistItens)
    .values({ vendaId, descricao })
    .returning({ id: lojaVendaChecklistItens.id });
  await registrarAuditoria("criar", "loja_checklist_item", item.id, `venda ${vendaId} — ${descricao}`);
  revalidatePath(`/loja/vendas/${vendaId}`);
}

export async function alternarChecklistVenda(vendaId: string, itemId: string, concluido: boolean) {
  await db
    .update(lojaVendaChecklistItens)
    .set({ concluido })
    .where(eq(lojaVendaChecklistItens.id, itemId));
  await registrarAuditoria("atualizar", "loja_checklist_item", itemId, concluido ? "concluído" : "reaberto");
  revalidatePath(`/loja/vendas/${vendaId}`);
}

export async function enviarDocumentoVenda(vendaId: string, formData: FormData) {
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione um arquivo.");
  const erroArquivo = validarArquivo(arquivo, "documento");
  if (erroArquivo) throw new Error(erroArquivo);

  const dir = path.join(uploadsDir(), "loja", "vendas", vendaId);
  await mkdir(dir, { recursive: true });
  const extensao = path.extname(arquivo.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(dir, nomeArquivo), bytes);

  await db.insert(lojaVendaDocumentos).values({
    vendaId,
    tipo: String(formData.get("tipo") ?? "") || "outro",
    nomeOriginal: arquivo.name,
    caminho: path.join("loja", "vendas", vendaId, nomeArquivo),
  });
  await registrarAuditoria("atualizar", "loja_venda", vendaId, `documento anexado: ${arquivo.name}`);
  revalidatePath(`/loja/vendas/${vendaId}`);
}

export async function criarOuAtualizarEntregaVenda(vendaId: string, formData: FormData) {
  const cidade = String(formData.get("cidade") ?? "").trim() || null;
  const responsavel = String(formData.get("responsavel") ?? "").trim() || null;
  const dataPrevista = String(formData.get("dataPrevista") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "pendente");

  const [existente] = await db.select().from(lojaEntregas).where(eq(lojaEntregas.vendaId, vendaId)).limit(1);
  if (existente) {
    await db
      .update(lojaEntregas)
      .set({ cidade, responsavel, dataPrevista, status })
      .where(eq(lojaEntregas.id, existente.id));
    await registrarAuditoria("atualizar", "loja_entrega", existente.id, `venda ${vendaId} — ${status}`);
  } else {
    const [entrega] = await db
      .insert(lojaEntregas)
      .values({ vendaId, cidade, responsavel, dataPrevista, status })
      .returning({ id: lojaEntregas.id });
    await registrarAuditoria("criar", "loja_entrega", entrega.id, `venda ${vendaId} — ${status}`);
  }
  revalidatePath(`/loja/vendas/${vendaId}`);
  revalidatePath("/loja/entregas");
}
