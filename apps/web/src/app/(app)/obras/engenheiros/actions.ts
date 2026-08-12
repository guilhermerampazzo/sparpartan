"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { engenheiros } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";

export async function criarEngenheiro(formData: FormData) {
  const nomeCompleto = String(formData.get("nomeCompleto") ?? "").trim();
  if (!nomeCompleto) throw new Error("Informe o nome completo do engenheiro.");

  const [engenheiro] = await db
    .insert(engenheiros)
    .values({
      nomeCompleto,
      cpf: String(formData.get("cpf") ?? "").trim() || null,
      crea: String(formData.get("crea") ?? "").trim() || null,
      tituloProfissional: String(formData.get("tituloProfissional") ?? "").trim() || null,
    })
    .returning({ id: engenheiros.id });

  await registrarAuditoria("criar", "engenheiro", engenheiro.id, nomeCompleto);
  revalidatePath("/obras/engenheiros");
  revalidatePath("/obras/novo");
}
