"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clientes, templatesEmail, enviosEmail } from "@/db/schema";
import { enviarEmail } from "@/lib/mail/adapter";
import { resolverVariaveis } from "@/lib/mail/templates";
import { registrarAuditoria } from "@/lib/audit";

const ASSUNTO_PADRAO = "Feliz Aniversário! 🎉 — Sparapan";
const CORPO_PADRAO =
  "<p>Olá {{nome}},</p><p>A equipe da Sparapan Solução Naval deseja um feliz aniversário! " +
  "Que seu novo ano venha com muitas boas navegações.</p><p>Abraços,<br>Sparapan Solução Naval</p>";

export async function enviarParabens(clienteId: string) {
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1);
  if (!cliente?.email) throw new Error("Cliente não possui e-mail cadastrado");

  const [template] = await db
    .select()
    .from(templatesEmail)
    .where(eq(templatesEmail.tipo, "aniversario"))
    .orderBy(desc(templatesEmail.criadoEm))
    .limit(1);

  const variaveis = { nome: cliente.nome, email: cliente.email };
  const assunto = template ? resolverVariaveis(template.assunto, variaveis) : ASSUNTO_PADRAO;
  const html = template ? resolverVariaveis(template.corpo, variaveis) : resolverVariaveis(CORPO_PADRAO, variaveis);

  let status: "enviado" | "falhou" = "enviado";
  let erro: string | null = null;
  try {
    await enviarEmail({ to: cliente.email, subject: assunto, html });
  } catch (e) {
    status = "falhou";
    erro = e instanceof Error ? e.message : String(e);
  }

  await db.insert(enviosEmail).values({
    clienteId,
    templateId: template?.id ?? null,
    destinatario: cliente.email,
    assunto,
    corpo: html,
    status,
    erro,
  });

  await registrarAuditoria(
    "atualizar",
    "envio_email",
    clienteId,
    `parabéns enviado para ${cliente.email}${erro ? ` (falhou: ${erro})` : ""}`
  );
  revalidatePath("/clientes/aniversariantes");
}
