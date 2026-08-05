"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { habilitacoes, arquivos, clientes, despesas } from "@/db/schema";
import { criarSolicitacao } from "@/lib/solicitacoes";
import { validarArquivo } from "@/lib/upload";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { Validador } from "@/lib/validacao";

/** Gasto extra vinculado ao cliente (correio, terceirizado...) — vira saída automática do financeiro. */
export async function criarDespesaCliente(clienteId: string, formData: FormData) {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = String(formData.get("valor") ?? "");
  const data = String(formData.get("data") ?? "") || new Date().toISOString().slice(0, 10);

  const erro = new Validador()
    .exigir(!!descricao, "Informe a descrição do gasto.")
    .exigir(!!valor && Number(valor) > 0, "Informe um valor válido.").erro;
  if (erro) throw new Error(erro);

  await db.insert(despesas).values({
    descricao,
    valor,
    data,
    categoria: "variavel",
    clienteId,
    criadoPorId: await idUsuarioEquipe(),
  });

  await registrarAuditoria("criar", "despesa", descricao, `gasto extra do cliente ${clienteId}`);
  revalidatePath(`/clientes/${clienteId}`);
  revalidatePath("/vendas/despesas");
  revalidatePath("/vendas/financeiro");
}

export async function excluirDespesaCliente(despesaId: string) {
  const [despesa] = await db.select().from(despesas).where(eq(despesas.id, despesaId)).limit(1);
  if (!despesa) throw new Error("Gasto não encontrado");

  await db.delete(despesas).where(eq(despesas.id, despesaId));
  await registrarAuditoria("excluir", "despesa", despesaId, despesa.descricao);

  revalidatePath(`/clientes/${despesa.clienteId ?? ""}`);
  revalidatePath("/vendas/despesas");
  revalidatePath("/vendas/financeiro");
}

export async function adicionarHabilitacao(clienteId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "") as "CHA" | "CIR";
  if (!tipo) throw new Error("Tipo da habilitação é obrigatório");

  await db.insert(habilitacoes).values({
    clienteId,
    tipo,
    numero: String(formData.get("numero") ?? "") || null,
    dataEmissao: String(formData.get("dataEmissao") ?? "") || null,
    categoria: String(formData.get("categoria") ?? "") || null,
    validade: String(formData.get("validade") ?? "") || null,
  });

  revalidatePath(`/clientes/${clienteId}`);
}

export async function enviarArquivo(clienteId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "").trim();
  const arquivo = formData.get("arquivo") as File | null;
  const embarcacaoId = String(formData.get("embarcacaoId") ?? "").trim() || null;
  const textoExtraido = String(formData.get("textoExtraido") ?? "").trim() || null;
  if (!tipo || !arquivo) {
    throw new Error("Tipo e arquivo são obrigatórios");
  }

  const erroArquivo = validarArquivo(arquivo);
  if (erroArquivo) throw new Error(erroArquivo);

  const uploadsDir = process.env.UPLOADS_DIR ?? "./data/uploads";
  const clienteDir = path.join(uploadsDir, "clientes", clienteId);
  await mkdir(clienteDir, { recursive: true });

  const extensao = path.extname(arquivo.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const caminhoCompleto = path.join(clienteDir, nomeArquivo);

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(caminhoCompleto, bytes);

  await db.insert(arquivos).values({
    clienteId,
    embarcacaoId,
    tipo,
    nomeOriginal: arquivo.name,
    caminho: path.join("clientes", clienteId, nomeArquivo),
    textoExtraido,
  });

  revalidatePath(`/clientes/${clienteId}`);
}

export async function definirSenhaPortal(clienteId: string, formData: FormData) {
  const senha = String(formData.get("senha") ?? "").trim();
  if (senha.length < 6) throw new Error("Senha precisa ter ao menos 6 caracteres");

  const senhaHash = await bcrypt.hash(senha, 10);
  await db
    .update(clientes)
    .set({ portalSenhaHash: senhaHash })
    .where(eq(clientes.id, clienteId));

  revalidatePath(`/clientes/${clienteId}`);
}

export async function gerarLinkCadastro(clienteId: string) {
  const token = await criarSolicitacao({ tipo: "cadastro_cliente", clienteId });
  redirect(`/clientes/${clienteId}?link=${token}`);
}

export async function gerarLinkEmbarcacao(clienteId: string) {
  const token = await criarSolicitacao({ tipo: "cadastro_embarcacao", clienteId });
  redirect(`/clientes/${clienteId}?link=${token}`);
}
