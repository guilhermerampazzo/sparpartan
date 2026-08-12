"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assinaturas, documentosGerados, clientes } from "@/db/schema";
import { enviarEmail } from "@/lib/mail/adapter";
import { registrarAuditoria } from "@/lib/audit";

export async function marcarDocumentoComoEntregue(documentoId: string) {
  const [documento] = await db
    .select()
    .from(documentosGerados)
    .where(eq(documentosGerados.id, documentoId))
    .limit(1);
  if (!documento) throw new Error("Documento não encontrado");
  if (documento.status !== "protocolado")
    throw new Error("Só é possível entregar um documento já protocolado.");

  await db
    .update(documentosGerados)
    .set({ status: "entregue" })
    .where(eq(documentosGerados.id, documentoId));

  await registrarAuditoria("alterar_status", "documento_gerado", documentoId, "entregue");
  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/documentos");
  if (documento.processoId) revalidatePath(`/processos/${documento.processoId}`);
}

export async function solicitarAssinatura(documentoId: string) {
  const [documento] = await db
    .select()
    .from(documentosGerados)
    .where(eq(documentosGerados.id, documentoId))
    .limit(1);
  if (!documento) throw new Error("Documento não encontrado");

  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, documento.clienteId))
    .limit(1);
  if (!cliente) throw new Error("Cliente não encontrado");

  const token = randomUUID();
  const expiraEm = new Date(Date.now() + 7 * 86400000);

  await db.insert(assinaturas).values({
    documentoId,
    clienteId: cliente.id,
    token,
    expiraEm,
  });

  await registrarAuditoria("criar", "assinatura", documentoId, `solicitada para ${cliente.nome} — expira em ${expiraEm.toISOString().slice(0, 10)}`);

  if (cliente.email) {
    const baseUrl = process.env.AUTH_URL || "http://localhost:8080";
    try {
      await enviarEmail({
        to: cliente.email,
        subject: "Assinatura de documento pendente — Sparapan",
        html: `<p>Olá ${cliente.nome},</p><p>Você tem um documento para assinar. Acesse o link abaixo (válido por 7 dias):</p><p><a href="${baseUrl}/assinar/${token}">${baseUrl}/assinar/${token}</a></p>`,
      });
    } catch {
      // Falha de e-mail não impede o link de existir — a equipe pode repassar manualmente.
    }
  }

  revalidatePath(`/documentos/${documentoId}`);
}
