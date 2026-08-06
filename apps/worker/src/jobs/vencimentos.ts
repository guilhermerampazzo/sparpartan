import { sql } from "../db.js";
import { enviarERegistrar } from "../mail.js";

const JANELAS_DIAS = [30, 15, 7];

type ItemVencendo = {
  id: string;
  clienteId: string;
  clienteNome: string;
  clienteEmail: string | null;
  descricao: string;
  vencimento: string;
};

/**
 * As 4 fontes de vencimento do negócio. Antes só documentos_gerados era varrido —
 * e, como `vencimento` nunca era preenchido, na prática nada era varrido.
 */
async function fontesVencendo(dias: number): Promise<{ tipo: string; itens: ItemVencendo[] }[]> {
  const documentos = await sql<ItemVencendo[]>`
    SELECT d.id, d.cliente_id as "clienteId", c.nome as "clienteNome", c.email as "clienteEmail",
           m.nome as "descricao", d.vencimento
    FROM documentos_gerados d
    JOIN modelos_documento m ON m.id = d.modelo_id
    JOIN clientes c ON c.id = d.cliente_id
    WHERE d.vencimento = (current_date + ${dias}::int)
      AND c.excluido_em IS NULL
  `;

  const dpem = await sql<ItemVencendo[]>`
    SELECT e.id, e.cliente_id as "clienteId", c.nome as "clienteNome", c.email as "clienteEmail",
           ('DPEM da embarcação ' || e.nome) as "descricao", e.validade_dpem as vencimento
    FROM embarcacoes e
    JOIN clientes c ON c.id = e.cliente_id
    WHERE e.validade_dpem = (current_date + ${dias}::int)
      AND e.ativo = true
      AND c.excluido_em IS NULL
  `;

  const salvatagem = await sql<ItemVencendo[]>`
    SELECT s.id, e.cliente_id as "clienteId", c.nome as "clienteNome", c.email as "clienteEmail",
           (s.item || ' da embarcação ' || e.nome) as "descricao", s.validade as vencimento
    FROM salvatagem_itens s
    JOIN embarcacoes e ON e.id = s.embarcacao_id
    JOIN clientes c ON c.id = e.cliente_id
    WHERE s.validade = (current_date + ${dias}::int)
      AND c.excluido_em IS NULL
  `;

  const habilitacoes = await sql<ItemVencendo[]>`
    SELECT h.id, h.cliente_id as "clienteId", c.nome as "clienteNome", c.email as "clienteEmail",
           ('Habilitação ' || h.tipo) as "descricao", h.validade as vencimento
    FROM habilitacoes h
    JOIN clientes c ON c.id = h.cliente_id
    WHERE h.validade = (current_date + ${dias}::int)
      AND c.excluido_em IS NULL
  `;

  return [
    { tipo: "documento_gerado", itens: documentos },
    { tipo: "dpem", itens: dpem },
    { tipo: "salvatagem", itens: salvatagem },
    { tipo: "habilitacao", itens: habilitacoes },
  ];
}

export async function verificarVencimentos() {
  let criados = 0;

  for (const dias of JANELAS_DIAS) {
    for (const { tipo, itens } of await fontesVencendo(dias)) {
      for (const item of itens) {
        const vencimentoFormatado = new Date(item.vencimento).toLocaleDateString("pt-BR");
        const mensagem = `${item.descricao} vence em ${dias} dias (${vencimentoFormatado}).`;

        // Antes cada janela (30/15/7 dias) criava um lembrete novo — o mesmo
        // vencimento virava 3 linhas que o operador tinha que resolver uma a uma.
        // Agora existe no máximo 1 lembrete não resolvido por referência: as janelas
        // seguintes apenas atualizam a mensagem da mesma linha.
        const [existente] = await sql`
          SELECT id FROM lembretes
          WHERE referencia_tipo = ${tipo}
            AND referencia_id = ${item.id}
            AND resolvido = false
        `;

        if (existente) {
          await sql`
            UPDATE lembretes SET mensagem = ${mensagem}, data_lembrete = current_date
            WHERE id = ${existente.id}
          `;
        } else {
          await sql`
            INSERT INTO lembretes (cliente_id, mensagem, data_lembrete, origem, referencia_tipo, referencia_id)
            VALUES (${item.clienteId}, ${mensagem}, current_date, 'auto', ${tipo}, ${item.id})
          `;
          criados++;
        }

        // Oferta de renovação: só na janela de 30 dias, para não spammar o cliente 3x.
        // Com trava de idempotência — um restart do worker ou retry do BullMQ no
        // mesmo dia não reenvia o e-mail (o envio já fica registrado em envios_email).
        if (dias === 30 && item.clienteEmail) {
          const [jaEnviado] = await sql`
            SELECT id FROM envios_email
            WHERE cliente_id = ${item.clienteId}
              AND criado_em::date = current_date
              AND assunto ILIKE '%vence em 30 dias%'
              AND status = 'enviado'
          `;

          if (!jaEnviado) {
            await enviarERegistrar({
              clienteId: item.clienteId,
              to: item.clienteEmail,
              subject: `${item.descricao} vence em 30 dias — Sparapan`,
              html: `<p>Olá ${item.clienteNome},</p>
                 <p>Passando para avisar que <strong>${item.descricao}</strong> vence em <strong>${vencimentoFormatado}</strong>.</p>
                 <p>Podemos cuidar da renovação para você — é só responder este e-mail.</p>
                 <p>Sparapan Solução Naval</p>`,
            });
          }
        }
      }
    }
  }

  return criados;
}
