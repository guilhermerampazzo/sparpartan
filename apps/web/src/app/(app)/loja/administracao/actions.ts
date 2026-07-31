"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { lojaFabricantes, lojaFornecedores, lojaTransportadoras } from "@/db/schema";

const TABELAS = {
  fabricantes: lojaFabricantes,
  fornecedores: lojaFornecedores,
  transportadoras: lojaTransportadoras,
} as const;

type Tipo = keyof typeof TABELAS;

export async function criarItemAdministracaoLoja(tipo: Tipo, formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Informe o nome.");
  await db.insert(TABELAS[tipo]).values({ nome });
  revalidatePath("/loja/administracao");
}

export async function excluirItemAdministracaoLoja(tipo: Tipo, id: string) {
  await db.delete(TABELAS[tipo]).where(eq(TABELAS[tipo].id, id));
  revalidatePath("/loja/administracao");
}
