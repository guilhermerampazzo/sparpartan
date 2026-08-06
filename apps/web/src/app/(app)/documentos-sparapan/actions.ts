"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { arquivosEmpresa } from "@/db/schema";
import { salvarArquivoLocal } from "@/lib/storage";
import { uploadsDir } from "@/lib/storage";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

export async function criarArquivoEmpresa(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "").trim();
  const arquivo = formData.get("arquivo") as File | null;
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!titulo, "Informe o título.")
    .exigir(!!categoria, "Selecione a categoria.")
    .exigir(!!arquivo && arquivo.size > 0, "Selecione um arquivo (PDF, JPG ou PNG).").erro;
  if (erro) return { erro, valores };

  let arquivoCaminho: string;
  try {
    arquivoCaminho = await salvarArquivoLocal(arquivo as File, "empresa", "documento");
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Falha ao salvar o arquivo.", valores };
  }

  const [registro] = await db
    .insert(arquivosEmpresa)
    .values({
      titulo,
      categoria,
      descricao: String(formData.get("descricao") ?? "") || null,
      arquivoCaminho,
    })
    .returning({ id: arquivosEmpresa.id });

  await registrarAuditoria("criar", "arquivo_empresa", registro.id, titulo);
  revalidatePath("/documentos-sparapan");
  return null;
}

export async function excluirArquivoEmpresa(id: string) {
  const [item] = await db.select().from(arquivosEmpresa).where(eq(arquivosEmpresa.id, id)).limit(1);
  if (!item) return;

  try {
    await unlink(path.join(uploadsDir(), item.arquivoCaminho));
  } catch {
    // Arquivo já ausente no disco não impede a exclusão do registro.
  }

  await db.delete(arquivosEmpresa).where(eq(arquivosEmpresa.id, id));
  await registrarAuditoria("excluir", "arquivo_empresa", id, item.titulo);
  revalidatePath("/documentos-sparapan");
}
