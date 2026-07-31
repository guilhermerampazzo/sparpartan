"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { usuarios } from "@/db/schema";

async function exigirAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") redirect("/");
}

export async function atualizarModulosPermitidos(usuarioId: string, formData: FormData) {
  await exigirAdmin();

  const acessoTotal = formData.get("acessoTotal") === "on";
  const modulos = acessoTotal ? null : formData.getAll("modulos").map(String);

  await db.update(usuarios).set({ modulosPermitidos: modulos }).where(eq(usuarios.id, usuarioId));

  revalidatePath("/configuracoes/usuarios");
  revalidatePath(`/configuracoes/usuarios/${usuarioId}`);
  redirect("/configuracoes/usuarios");
}
