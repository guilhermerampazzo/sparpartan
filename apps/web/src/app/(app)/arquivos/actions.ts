"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { arquivos } from "@/db/schema";
import { validarArquivo } from "@/lib/upload";
import { registrarAuditoria } from "@/lib/audit";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

/** Adiciona um arquivo direto na pasta do cliente. */
export async function adicionarArquivo(clienteId: string, formData: FormData) {
  const tipo = String(formData.get("tipo") ?? "").trim() || "outro";
  const arquivo = formData.get("arquivo") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione um arquivo.");

  const erroArquivo = validarArquivo(arquivo);
  if (erroArquivo) throw new Error(erroArquivo);

  const clienteDir = path.join(uploadsDir(), "clientes", clienteId);
  await mkdir(clienteDir, { recursive: true });

  const extensao = path.extname(arquivo.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(clienteDir, nomeArquivo), bytes);

  await db.insert(arquivos).values({
    clienteId,
    tipo,
    nomeOriginal: arquivo.name,
    caminho: path.join("clientes", clienteId, nomeArquivo),
  });

  await registrarAuditoria("criar", "arquivo", tipo, arquivo.name);
  revalidatePath("/arquivos");
  revalidatePath(`/clientes/${clienteId}`);
}

/** Renomeia/recategoriza um arquivo existente. */
export async function atualizarArquivo(arquivoId: string, formData: FormData) {
  const nomeOriginal = String(formData.get("nomeOriginal") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  if (!nomeOriginal) throw new Error("Informe o nome do arquivo.");

  await db
    .update(arquivos)
    .set({ nomeOriginal, tipo: tipo || "outro" })
    .where(eq(arquivos.id, arquivoId));

  await registrarAuditoria("atualizar", "arquivo", arquivoId, nomeOriginal);
  revalidatePath("/arquivos");
}

/** Exclui o arquivo do disco e do banco. */
export async function excluirArquivo(arquivoId: string) {
  const [arquivo] = await db.select().from(arquivos).where(eq(arquivos.id, arquivoId)).limit(1);
  if (!arquivo) throw new Error("Arquivo não encontrado");

  try {
    await unlink(path.join(uploadsDir(), arquivo.caminho));
  } catch {
    // arquivo já não existe no disco — sem problema
  }

  await db.delete(arquivos).where(eq(arquivos.id, arquivoId));
  await registrarAuditoria("excluir", "arquivo", arquivoId, arquivo.nomeOriginal);

  revalidatePath("/arquivos");
  if (arquivo.clienteId) revalidatePath(`/clientes/${arquivo.clienteId}`);
}

export async function redirecionarParaClientes() {
  redirect("/clientes");
}
