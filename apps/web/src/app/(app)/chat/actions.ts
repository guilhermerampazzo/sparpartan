"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mensagens, usuarios } from "@/db/schema";
import { auth } from "@/lib/auth";
import { salvarArquivoLocal } from "@/lib/storage";

async function usuarioEquipeLogado() {
  const session = await auth();
  const usuario = session?.user as { id?: string; name?: string; tipo?: string } | undefined;
  if (usuario?.tipo !== "equipe") throw new Error("Somente a equipe pode usar o chat.");
  return usuario;
}

export async function enviarMensagem(formData: FormData) {
  const corpo = String(formData.get("corpo") ?? "").trim();
  const destinatarioId = String(formData.get("destinatarioId") ?? "") || null;
  const anexo = formData.get("anexo");

  let anexoCaminho: string | null = null;
  let anexoNome: string | null = null;
  if (anexo instanceof File && anexo.size > 0) {
    anexoCaminho = await salvarArquivoLocal(anexo, "chat", "documento");
    anexoNome = anexo.name;
  }

  if (!corpo && !anexoCaminho) return;

  const usuario = await usuarioEquipeLogado();

  await db.insert(mensagens).values({
    usuarioId: usuario.id ?? null,
    usuarioNome: usuario.name ?? "Equipe",
    destinatarioId,
    corpo,
    anexoCaminho,
    anexoNome,
  });

  revalidatePath("/chat");
}

export async function editarMensagem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const corpo = String(formData.get("corpo") ?? "").trim();
  if (!id || !corpo) return;

  const usuario = await usuarioEquipeLogado();

  await db
    .update(mensagens)
    .set({ corpo, editadaEm: new Date() })
    .where(and(eq(mensagens.id, id), eq(mensagens.usuarioId, usuario.id ?? "")));

  revalidatePath("/chat");
}

export async function apagarMensagem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const usuario = await usuarioEquipeLogado();

  await db
    .update(mensagens)
    .set({ apagadaEm: new Date(), corpo: "" })
    .where(and(eq(mensagens.id, id), eq(mensagens.usuarioId, usuario.id ?? "")));

  revalidatePath("/chat");
}

export async function marcarChatComoLido() {
  const usuario = await usuarioEquipeLogado();
  if (!usuario.id) return;
  await db.update(usuarios).set({ chatUltimaLeituraEm: new Date() }).where(eq(usuarios.id, usuario.id));
}
