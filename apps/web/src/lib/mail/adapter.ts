import nodemailer from "nodemailer";

type EnviarEmailInput = {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
};

async function enviarViaSmtp(input: EnviarEmailInput) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "mailpit",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
    // Certificados auto-assinados são comuns em servidores de e-mail próprios
    // (Postfix/Dovecot). Sem isso, o STARTTLS falha com "self-signed certificate"
    // e nenhum e-mail sai.
    tls: { rejectUnauthorized: false },
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? "naoresponda@sparapan.com.br",
    to: input.to,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments,
  });
}

async function enviarViaResend(input: EnviarEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não configurada");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "naoresponda@sparapan.com.br",
      to: input.to,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64"),
      })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend respondeu ${res.status}: ${await res.text()}`);
  }
}

export async function enviarEmail(input: EnviarEmailInput) {
  const provider = process.env.MAIL_PROVIDER ?? "smtp";
  if (provider === "resend") {
    await enviarViaResend(input);
  } else {
    await enviarViaSmtp(input);
  }
}
