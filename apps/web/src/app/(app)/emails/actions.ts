"use server";

import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { templatesEmail, enviosEmail, clientes } from "@/db/schema";
import { enviarEmail } from "@/lib/mail/adapter";
import { resolverVariaveis } from "@/lib/mail/templates";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

export async function criarTemplate(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const assunto = String(formData.get("assunto") ?? "").trim();
  const corpo = String(formData.get("corpo") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome do template.")
    .exigir(!!assunto, "Informe o assunto.")
    .exigir(!!corpo, "Informe o corpo do e-mail.").erro;
  if (erro) return { erro, valores };

  await db.insert(templatesEmail).values({
    nome,
    tipo: String(formData.get("tipo") ?? "geral"),
    assunto,
    corpo,
  });

  redirect("/emails");
}

export async function atualizarTemplate(
  templateId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const assunto = String(formData.get("assunto") ?? "").trim();
  const corpo = String(formData.get("corpo") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome do template.")
    .exigir(!!assunto, "Informe o assunto.")
    .exigir(!!corpo, "Informe o corpo do e-mail.").erro;
  if (erro) return { erro, valores };

  await db
    .update(templatesEmail)
    .set({
      nome,
      tipo: String(formData.get("tipo") ?? "geral"),
      assunto,
      corpo,
    })
    .where(eq(templatesEmail.id, templateId));

  redirect("/emails");
}

export async function excluirTemplate(templateId: string) {
  await db.delete(templatesEmail).where(eq(templatesEmail.id, templateId));
  redirect("/emails");
}

export async function enviarEmailCliente(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const clienteId = String(formData.get("clienteId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const valores = valoresDoFormData(formData);

  const erroValidacao = new Validador()
    .exigir(!!clienteId, "Selecione o cliente.")
    .exigir(!!templateId, "Selecione o template.").erro;
  if (erroValidacao) return { erro: erroValidacao, valores };

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1);
  if (!cliente) return { erro: "Cliente não encontrado.", valores };
  if (!cliente.email) return { erro: "Cliente não possui e-mail cadastrado.", valores };

  const [template] = await db
    .select()
    .from(templatesEmail)
    .where(eq(templatesEmail.id, templateId))
    .limit(1);
  if (!template) return { erro: "Template não encontrado.", valores };

  const variaveis: Record<string, string> = {
    nome: cliente.nome,
    email: cliente.email ?? "",
  };

  const assunto = resolverVariaveis(template.assunto, variaveis);
  const corpo = resolverVariaveis(template.corpo, variaveis);

  let status: "enviado" | "falhou" = "enviado";
  let erroEnvio: string | null = null;
  try {
    await enviarEmail({ to: cliente.email, subject: assunto, html: corpo });
  } catch (e) {
    status = "falhou";
    erroEnvio = e instanceof Error ? e.message : String(e);
  }

  await db.insert(enviosEmail).values({
    clienteId,
    templateId,
    destinatario: cliente.email,
    assunto,
    corpo,
    status,
    erro: erroEnvio,
  });

  redirect("/emails");
}

/**
 * Campanha segmentada: envia o mesmo template para vários clientes de uma vez,
 * resolvendo as variáveis {{nome}}/{{email}} por destinatário e registrando cada
 * envio no histórico. Clientes sem e-mail são ignorados.
 */
export async function enviarEmailCampanha(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const templateId = String(formData.get("templateId") ?? "").trim();
  const ids = formData.getAll("clienteIds").map(String).filter(Boolean);
  const valores = valoresDoFormData(formData);

  const erroValidacao = new Validador()
    .exigir(!!templateId, "Selecione o template.")
    .exigir(ids.length > 0, "Selecione ao menos um cliente.").erro;
  if (erroValidacao) return { erro: erroValidacao, valores };

  const [template] = await db
    .select()
    .from(templatesEmail)
    .where(eq(templatesEmail.id, templateId))
    .limit(1);
  if (!template) return { erro: "Template não encontrado.", valores };

  const selecionados = await db.select().from(clientes).where(inArray(clientes.id, ids));

  let enviados = 0;
  let falhas = 0;
  let semEmail = 0;

  for (const cliente of selecionados) {
    if (!cliente.email) {
      semEmail++;
      continue;
    }

    const variaveis: Record<string, string> = { nome: cliente.nome, email: cliente.email };
    const assunto = resolverVariaveis(template.assunto, variaveis);
    const corpo = resolverVariaveis(template.corpo, variaveis);

    let status: "enviado" | "falhou" = "enviado";
    let erroEnvio: string | null = null;
    try {
      await enviarEmail({ to: cliente.email, subject: assunto, html: corpo });
    } catch (e) {
      status = "falhou";
      erroEnvio = e instanceof Error ? e.message : String(e);
    }

    if (status === "enviado") enviados++;
    else falhas++;

    await db.insert(enviosEmail).values({
      clienteId: cliente.id,
      templateId,
      destinatario: cliente.email,
      assunto,
      corpo,
      status,
      erro: erroEnvio,
    });
  }

  return {
    resumo: `Campanha enviada: ${enviados} e-mail(s) enviado(s)${falhas > 0 ? `, ${falhas} com falha` : ""}${semEmail > 0 ? `, ${semEmail} cliente(s) sem e-mail ignorado(s)` : ""}.`,
    valores: { templateId },
  };
}
