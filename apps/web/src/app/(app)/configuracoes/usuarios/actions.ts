"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import {
  Validador,
  emailValido,
  valoresDoFormData,
  type EstadoForm,
} from "@/lib/validacao";

async function exigirAdmin(): Promise<{ id?: string; role?: string } | undefined> {
  const session = await auth();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user || user.role !== "admin") redirect("/");
  return user;
}

export async function criarUsuario(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  await exigirAdmin();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const role = String(formData.get("role") ?? "operador") as "admin" | "operador" | "leitura";
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome.")
    .exigir(!!email, "Informe o e-mail.")
    .exigir(!!senha, "Informe a senha.")
    .sePreenchido(email, emailValido, "E-mail inválido.")
    .exigir(senha.length >= 6, "A senha precisa ter ao menos 6 caracteres.").erro;
  if (erro) return { erro, valores };

  const [jaExiste] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1);
  if (jaExiste) return { erro: "Já existe um usuário com esse e-mail.", valores };

  const acessoTotal = role === "admin" || formData.get("acessoTotal") === "on";
  const modulosPermitidos = acessoTotal ? null : formData.getAll("modulos").map(String);

  const senhaHash = await bcrypt.hash(senha, 10);
  const [usuario] = await db
    .insert(usuarios)
    .values({ nome, email, senhaHash, role, modulosPermitidos })
    .returning({ id: usuarios.id });

  await registrarAuditoria("criar", "usuario", usuario.id, nome);
  redirect("/configuracoes/usuarios");
}

export async function excluirUsuario(usuarioId: string) {
  const usuarioLogado = await exigirAdmin();
  if (usuarioLogado?.id === usuarioId) throw new Error("Você não pode excluir a própria conta.");

  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
  if (!usuario) throw new Error("Usuário não encontrado.");
  if (usuario.role === "admin") throw new Error("Não é possível excluir um administrador.");

  await db.delete(usuarios).where(eq(usuarios.id, usuarioId));
  await registrarAuditoria("excluir", "usuario", usuarioId, usuario.nome);

  revalidatePath("/configuracoes/usuarios");
  redirect("/configuracoes/usuarios");
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
