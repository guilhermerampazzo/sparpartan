import { sql } from "../db.js";
import { enviarERegistrar } from "../mail.js";

const JANELAS_PROVA_DIAS = [3, 1];

export async function confirmarCompromissos() {
  let criados = 0;

  const eventos = await sql<{ id: string; clienteId: string; titulo: string; tipo: string }[]>`
    SELECT e.id, e.cliente_id as "clienteId", e.titulo, e.tipo
    FROM agenda_eventos e
    LEFT JOIN clientes c ON c.id = e.cliente_id
    WHERE e.status = 'pendente'
      AND e.tipo != 'prova'
      AND e.data_hora::date = (current_date + 1)
      AND (c.excluido_em IS NULL OR c.id IS NULL)
  `;

  for (const evento of eventos) {
    const [existe] = await sql`
      SELECT id FROM lembretes
      WHERE referencia_tipo = 'agenda_evento'
        AND referencia_id = ${evento.id}
        AND data_lembrete = current_date
    `;
    if (existe) continue;

    await sql`
      INSERT INTO lembretes (cliente_id, mensagem, data_lembrete, origem, referencia_tipo, referencia_id)
      VALUES (
        ${evento.clienteId},
        ${`Compromisso "${evento.titulo}" amanhã — confirmar presença.`},
        current_date,
        'auto',
        'agenda_evento',
        ${evento.id}
      )
    `;
    criados++;
  }

  return criados;
}

export async function confirmarProvas() {
  let criados = 0;

  for (const dias of JANELAS_PROVA_DIAS) {
    const provas = await sql<
      { id: string; clienteId: string; clienteNome: string; clienteEmail: string | null; titulo: string; dataHora: string }[]
    >`
      SELECT e.id, e.cliente_id as "clienteId", c.nome as "clienteNome", c.email as "clienteEmail",
             e.titulo, e.data_hora as "dataHora"
      FROM agenda_eventos e
      LEFT JOIN clientes c ON c.id = e.cliente_id
      WHERE e.status != 'cancelado'
        AND e.tipo = 'prova'
        AND e.data_hora::date = (current_date + ${dias}::int)
        AND (c.excluido_em IS NULL OR c.id IS NULL)
    `;

    for (const prova of provas) {
      const dataFormatada = new Date(prova.dataHora).toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      });
      const mensagem = `Prova "${prova.titulo}" em ${dias} dia(s) (${dataFormatada}).`;

      // Uma única referência ('prova') para as janelas de 3 e 1 dia — antes cada
      // janela usava uma chave diferente e a mesma prova gerava 2 lembretes.
      const [existente] = await sql`
        SELECT id FROM lembretes
        WHERE referencia_tipo = 'prova' AND referencia_id = ${prova.id} AND resolvido = false
      `;

      if (existente) {
        await sql`UPDATE lembretes SET mensagem = ${mensagem}, data_lembrete = current_date WHERE id = ${existente.id}`;
      } else {
        await sql`
          INSERT INTO lembretes (cliente_id, mensagem, data_lembrete, origem, referencia_tipo, referencia_id)
          VALUES (${prova.clienteId}, ${mensagem}, current_date, 'auto', 'prova', ${prova.id})
        `;
        criados++;
      }

      if (prova.clienteEmail) {
        // Trava de idempotência: um retry do BullMQ no mesmo dia não reenvia o
        // e-mail de prova (o envio já fica registrado em envios_email).
        const [jaEnviado] = await sql`
          SELECT id FROM envios_email
          WHERE cliente_id = ${prova.clienteId}
            AND criado_em::date = current_date
            AND assunto ILIKE '%Sua prova é em%'
            AND status = 'enviado'
        `;

        if (!jaEnviado) {
          await enviarERegistrar({
            clienteId: prova.clienteId,
            to: prova.clienteEmail,
            subject: `Sua prova é em ${dias} dia${dias > 1 ? "s" : ""} — Sparapan`,
            html: `<p>Olá ${prova.clienteNome},</p><p>Confirmando: sua prova <strong>${prova.titulo}</strong> está marcada para <strong>${dataFormatada}</strong>.</p><p>Sparapan Solução Naval</p>`,
          });
        }
      }
    }
  }

  return criados;
}
