"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { salvatagemItens } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";

export async function adicionarItemSalvatagem(embarcacaoId: string, formData: FormData) {
  const item = String(formData.get("item") ?? "").trim();
  if (!item) throw new Error("Item é obrigatório");

  const [registro] = await db
    .insert(salvatagemItens)
    .values({
      embarcacaoId,
      item,
      quantidade: Number(formData.get("quantidade") ?? 1) || 1,
      validade: String(formData.get("validade") ?? "") || null,
    })
    .returning({ id: salvatagemItens.id });

  await registrarAuditoria("criar", "salvatagem_item", registro.id, `embarcação ${embarcacaoId} — ${item}`);
  revalidatePath(`/embarcacoes/${embarcacaoId}`);
}
