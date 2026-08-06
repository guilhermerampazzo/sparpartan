import { sql } from "../db.js";

/**
 * Os enums do banco tinham status que nenhum código escrevia — orçamento nunca
 * expirava, documento nunca vencia, pagamento nunca atrasava. Os cards da Home
 * que contavam esses status retornavam sempre 0. Este job os torna reais.
 */
export async function varrerStatus() {
  const orcamentos = await sql`
    UPDATE orcamentos SET status = 'expirado'
    WHERE status = 'pendente' AND valido_ate IS NOT NULL AND valido_ate < current_date
    RETURNING id
  `;

  const documentos = await sql`
    UPDATE documentos_gerados SET status = 'vencido'
    WHERE status <> 'vencido' AND vencimento IS NOT NULL AND vencimento < current_date
    RETURNING id
  `;

  const solicitacoes = await sql`
    UPDATE solicitacoes SET status = 'expirada'
    WHERE status = 'pendente' AND expira_em < now()
    RETURNING id
  `;

  const pagamentos = await sql`
    UPDATE pagamentos SET status = 'atrasado'
    WHERE status = 'pendente' AND data_vencimento IS NOT NULL AND data_vencimento < current_date
    RETURNING id
  `;

  // Compromissos passados que ninguém fechou ficavam "pendente" para sempre e
  // continuavam elegíveis a lembrete. `data_hora < current_date` (hoje, 00:00)
  // fecha qualquer evento com data anterior ao dia corrente — um evento de ontem
  // à tarde, por exemplo, não passava no antigo `current_date - 1`.
  const eventos = await sql`
    UPDATE agenda_eventos SET status = 'concluido'
    WHERE status = 'pendente' AND data_hora < current_date
    RETURNING id
  `;

  const lembretesResolvidos = await limparLembretesObsoletos();

  return {
    orcamentosExpirados: orcamentos.length,
    documentosVencidos: documentos.length,
    solicitacoesExpiradas: solicitacoes.length,
    pagamentosAtrasados: pagamentos.length,
    eventosConcluidos: eventos.length,
    lembretesResolvidos,
  };
}

/**
 * Antes, um lembrete de vencimento ficava pendurado na lista mesmo depois do
 * documento ser renovado, ou do compromisso ser confirmado/concluído — o operador
 * tinha que resolver na mão algo que já não fazia mais sentido cobrar.
 */
async function limparLembretesObsoletos(): Promise<number> {
  const documento = await sql`
    UPDATE lembretes SET resolvido = true
    WHERE resolvido = false AND referencia_tipo = 'documento_gerado'
      AND NOT EXISTS (
        SELECT 1 FROM documentos_gerados d
        WHERE d.id = lembretes.referencia_id
          AND d.vencimento BETWEEN current_date AND current_date + 30
      )
    RETURNING id
  `;

  const dpem = await sql`
    UPDATE lembretes SET resolvido = true
    WHERE resolvido = false AND referencia_tipo = 'dpem'
      AND NOT EXISTS (
        SELECT 1 FROM embarcacoes e
        WHERE e.id = lembretes.referencia_id
          AND e.validade_dpem BETWEEN current_date AND current_date + 30
      )
    RETURNING id
  `;

  const salvatagem = await sql`
    UPDATE lembretes SET resolvido = true
    WHERE resolvido = false AND referencia_tipo = 'salvatagem'
      AND NOT EXISTS (
        SELECT 1 FROM salvatagem_itens s
        WHERE s.id = lembretes.referencia_id
          AND s.validade BETWEEN current_date AND current_date + 30
      )
    RETURNING id
  `;

  const habilitacao = await sql`
    UPDATE lembretes SET resolvido = true
    WHERE resolvido = false AND referencia_tipo = 'habilitacao'
      AND NOT EXISTS (
        SELECT 1 FROM habilitacoes h
        WHERE h.id = lembretes.referencia_id
          AND h.validade BETWEEN current_date AND current_date + 30
      )
    RETURNING id
  `;

  // Compromisso confirmado ou concluído não precisa mais do lembrete de "amanhã".
  const compromisso = await sql`
    UPDATE lembretes SET resolvido = true
    WHERE resolvido = false AND referencia_tipo = 'agenda_evento'
      AND NOT EXISTS (
        SELECT 1 FROM agenda_eventos e
        WHERE e.id = lembretes.referencia_id AND e.status = 'pendente'
      )
    RETURNING id
  `;

  // Prova cancelada, remarcada para fora da janela de 3 dias, ou já realizada.
  const prova = await sql`
    UPDATE lembretes SET resolvido = true
    WHERE resolvido = false AND referencia_tipo = 'prova'
      AND NOT EXISTS (
        SELECT 1 FROM agenda_eventos e
        WHERE e.id = lembretes.referencia_id
          AND e.status != 'cancelado'
          AND e.data_hora::date BETWEEN current_date AND current_date + 3
      )
    RETURNING id
  `;

  return (
    documento.length +
    dpem.length +
    salvatagem.length +
    habilitacao.length +
    compromisso.length +
    prova.length
  );
}
