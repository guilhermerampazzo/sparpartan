"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assinaturas, clientes } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";

export async function assinarDocumento(token: string) {
  const [assinatura] = await db
    .select()
    .from(assinaturas)
    .where(eq(assinaturas.token, token))
    .limit(1);

  if (!assinatura) throw new Error("Link de assinatura inválido");
  if (assinatura.status === "assinado") return;
  if (new Date(assinatura.expiraEm) < new Date()) {
    await db.update(assinaturas).set({ status: "expirado" }).where(eq(assinaturas.id, assinatura.id));
    throw new Error("Link de assinatura expirado");
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? "desconhecido";
  const assinadoEm = new Date();

  const hash = createHash("sha256")
    .update(`${assinatura.documentoId}|${assinatura.clienteId}|${token}|${assinadoEm.toISOString()}|${ip}`)
    .digest("hex");

  await db
    .update(assinaturas)
    .set({ status: "assinado", assinadoEm, hash, ip })
    .where(eq(assinaturas.id, assinatura.id));

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, assinatura.clienteId)).limit(1);
  await registrarAuditoria(
    "alterar_status",
    "assinatura",
    assinatura.id,
    `documento ${assinatura.documentoId} assinado (IP ${ip})`,
    cliente?.nome ?? "cliente"
  );

  revalidatePath(`/assinar/${token}`);
}
