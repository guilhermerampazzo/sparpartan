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
  lojaEntregaDocumentos,
} from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { validarArquivo } from "@/lib/upload";

const ORDEM_STATUS_ENTREGA = ["aguardando", "preparando", "em_transporte", "entregue"] as const;
type StatusEntrega = (typeof ORDEM_STATUS_ENTREGA)[number];

function normalizarStatusEntrega(status: string): StatusEntrega {
  const mapeado: Record<string, StatusEntrega> = {
    pendente: "aguardando",
    em_transito: "em_transporte",
  };
  const valor = mapeado[status] ?? status;
  return (ORDEM_STATUS_ENTREGA as readonly string[]).includes(valor)
    ? (valor as StatusEntrega)
    : "aguardando";
}

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
  const status = normalizarStatusEntrega(String(formData.get("status") ?? "aguardando"));
  const endereco = String(formData.get("endereco") ?? "").trim() || null;
  const transportadora = String(formData.get("transportadora") ?? "").trim() || null;
  const dataRealizada = String(formData.get("dataRealizada") ?? "").trim() || null;
  const frete = String(formData.get("frete") ?? "0").trim() || "0";
  const pedagio = String(formData.get("pedagio") ?? "0").trim() || "0";
  const outrosCustos = String(formData.get("outrosCustos") ?? "0").trim() || "0";
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const usuarioId = await idUsuarioEquipe();

  const [existente] = await db.select().from(lojaEntregas).where(eq(lojaEntregas.vendaId, vendaId)).limit(1);
  if (existente) {
    await db
      .update(lojaEntregas)
      .set({
        cidade,
        responsavel,
        dataPrevista,
        status,
        endereco,
        transportadora,
        dataRealizada,
        frete,
        pedagio,
        outrosCustos,
        observacoes,
        atualizadoPorId: usuarioId,
        atualizadoEm: new Date(),
      })
      .where(eq(lojaEntregas.id, existente.id));
    await registrarAuditoria("atualizar", "loja_entrega", existente.id, `venda ${vendaId} — ${status}`);
  } else {
    const [entrega] = await db
      .insert(lojaEntregas)
      .values({
        vendaId,
        cidade,
        responsavel,
        dataPrevista,
        status,
        endereco,
        transportadora,
        dataRealizada,
        frete,
        pedagio,
        outrosCustos,
        observacoes,
        criadoPorId: usuarioId,
        atualizadoPorId: usuarioId,
        atualizadoEm: new Date(),
      })
      .returning({ id: lojaEntregas.id });
    await registrarAuditoria("criar", "loja_entrega", entrega.id, `venda ${vendaId} — ${status}`);
  }
  revalidatePath(`/loja/vendas/${vendaId}`);
  revalidatePath("/loja/entregas");
}

export async function avancarStatusEntrega(entregaId: string) {
  const [entrega] = await db.select().from(lojaEntregas).where(eq(lojaEntregas.id, entregaId)).limit(1);
  if (!entrega) throw new Error("Entrega não encontrada.");

  const indiceAtual = ORDEM_STATUS_ENTREGA.indexOf(normalizarStatusEntrega(entrega.status));
  const proximo = ORDEM_STATUS_ENTREGA[Math.min(indiceAtual + 1, ORDEM_STATUS_ENTREGA.length - 1)];
  if (proximo === normalizarStatusEntrega(entrega.status)) {
    throw new Error("A entrega já foi concluída.");
  }

  await db
    .update(lojaEntregas)
    .set({ status: proximo, atualizadoPorId: await idUsuarioEquipe(), atualizadoEm: new Date() })
    .where(eq(lojaEntregas.id, entregaId));

  if (proximo === "entregue") {
    await db.update(lojaVendas).set({ status: "entregue" }).where(eq(lojaVendas.id, entrega.vendaId));
  }

  await registrarAuditoria("atualizar", "loja_entrega", entregaId, `status → ${proximo}`);
  revalidatePath(`/loja/vendas/${entrega.vendaId}`);
  revalidatePath("/loja/entregas");
}

export async function adicionarDocumentoEntrega(entregaId: string, formData: FormData) {
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione um arquivo.");
  const erroArquivo = validarArquivo(arquivo, "documento");
  if (erroArquivo) throw new Error(erroArquivo);

  const [entrega] = await db.select().from(lojaEntregas).where(eq(lojaEntregas.id, entregaId)).limit(1);
  if (!entrega) throw new Error("Entrega não encontrada.");

  const dir = path.join(uploadsDir(), "loja", "entregas", entregaId);
  await mkdir(dir, { recursive: true });
  const extensao = path.extname(arquivo.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(dir, nomeArquivo), bytes);

  await db.insert(lojaEntregaDocumentos).values({
    entregaId,
    tipo: String(formData.get("tipo") ?? "") || "outro",
    nomeOriginal: arquivo.name,
    caminho: path.join("loja", "entregas", entregaId, nomeArquivo),
    criadoPorId: await idUsuarioEquipe(),
  });
  await registrarAuditoria("atualizar", "loja_entrega", entregaId, `documento anexado: ${arquivo.name}`);
  revalidatePath(`/loja/vendas/${entrega.vendaId}`);
  revalidatePath("/loja/entregas");
}
