"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { catalogoItens } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

export async function criarItemCatalogo(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!descricao, "Informe a descrição.").erro;
  if (erro) return { erro, valores };

  const [item] = await db
    .insert(catalogoItens)
    .values({
      tipo: String(formData.get("tipo") ?? "embarcacao") as "embarcacao" | "motor" | "carreta",
      descricao,
      marca: String(formData.get("marca") ?? "") || null,
      modelo: String(formData.get("modelo") ?? "") || null,
      preco: String(formData.get("preco") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
    })
    .returning({ id: catalogoItens.id });

  await registrarAuditoria("criar", "catalogo_item", item.id, descricao);
  revalidatePath("/servicos/catalogo");
  return null;
}
