import nodemailer from "nodemailer";
import { sql } from "./db.js";

export async function enviarEmail(to: string, subject: string, html: string) {
  const provider = process.env.MAIL_PROVIDER ?? "smtp";

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY não configurada");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "naoresponda@sparapan.com.br",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) throw new Error(`Resend respondeu ${res.status}: ${await res.text()}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "mailpit",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    // Certificados auto-assinados são comuns em servidores de e-mail próprios
    // (Postfix/Dovecot). Sem isso, o STARTTLS falha com "self-signed certificate".
    tls: { rejectUnauthorized: false },
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? "naoresponda@sparapan.com.br",
    to,
    subject,
    html,
  });
}

/**
 * Antes, os e-mails automáticos do worker (vencimento, prova, digest) sumiam no
 * catch{} sem deixar rastro — /emails só mostrava envios manuais, e falha de envio
 * automático não aparecia em lugar nenhum. Esta função sempre grava o resultado.
 */
export async function enviarERegistrar(input: {
  clienteId?: string | null;
  to: string;
  subject: string;
  html: string;
}) {
  let status: "enviado" | "falhou" = "enviado";
  let erro: string | null = null;

  try {
    await enviarEmail(input.to, input.subject, input.html);
  } catch (e) {
    status = "falhou";
    erro = e instanceof Error ? e.message : String(e);
  }

  await sql`
    INSERT INTO envios_email (cliente_id, destinatario, assunto, corpo, status, erro)
    VALUES (${input.clienteId ?? null}, ${input.to}, ${input.subject}, ${input.html}, ${status}, ${erro})
  `;

  return status;
}
