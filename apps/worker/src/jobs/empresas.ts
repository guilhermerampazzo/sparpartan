import { sql } from "../db.js";

/**
 * Varre diariamente as empresas contratantes e cria os alertas de vencimento:
 * 35 dias → "vencimento_proximo", 15 dias → "vencimento_urgente", venceu → "vencido"
 * e manutenções com próxima data ≤ 35 dias → "manutencao_proxima".
 * Não duplica alertas ativos nem apaga os que o usuário ainda não resolveu.
 */
export async function varrerEmpresas(): Promise<{ empresas: number; alertas: number }> {
  const empresas = await sql`SELECT id FROM empresas WHERE status = 'ativa'`;

  let alertas = 0;
  for (const empresa of empresas as { id: string }[]) {
    alertas += await atualizarAlertasEmpresa(empresa.id);
  }

  return { empresas: (empresas as { id: string }[]).length, alertas };
}

/** Recalcula os alertas de uma empresa (35/15/vencido + manutenções). Retorna quantos foram criados. */
export async function atualizarAlertasEmpresa(empresaId: string): Promise<number> {
  let criados = 0;

  // Documentos não regularizados com vencimento — alerta por faixa
  const documentos = await sql`
    SELECT id, titulo, tipo, data_vencimento,
           (data_vencimento - current_date) AS dias
    FROM empresa_documentos
    WHERE empresa_id = ${empresaId} AND regularizado = false AND data_vencimento IS NOT NULL
  `;

  for (const doc of documentos as { id: string; titulo: string | null; tipo: string; dias: number }[]) {
    const tipo = doc.dias < 0 ? "vencido" : doc.dias <= 15 ? "vencimento_urgente" : doc.dias <= 35 ? "vencimento_proximo" : null;
    if (!tipo) continue;

    const mensagem =
      doc.dias < 0
        ? `Documento ${doc.titulo ?? doc.tipo} VENCIDO há ${Math.abs(doc.dias)} dia(s).`
        : `Documento ${doc.titulo ?? doc.tipo} vence em ${doc.dias} dia(s).`;

    const jaExiste = await sql`
      SELECT 1 FROM empresa_alertas
      WHERE empresa_id = ${empresaId} AND documento_id = ${doc.id} AND tipo = ${tipo} AND resolvido = false
      LIMIT 1
    `;

    if ((jaExiste as unknown[]).length === 0) {
      await sql`
        INSERT INTO empresa_alertas (empresa_id, documento_id, tipo, mensagem)
        VALUES (${empresaId}, ${doc.id}, ${tipo}, ${mensagem})
      `;
      criados++;
    }
  }

  // Manutenções com próxima data (manutenção ou troca de óleo) ≤ 35 dias
  const manutencoes = await sql`
    SELECT id, descricao, tipo,
           LEAST(
             COALESCE(proxima_manutencao, '9999-12-31'),
             COALESCE(proxima_troca_oleo, '9999-12-31')
           ) AS proxima
    FROM empresa_manutencoes
    WHERE empresa_id = ${empresaId}
      AND (proxima_manutencao IS NOT NULL OR proxima_troca_oleo IS NOT NULL)
  `;

  for (const m of manutencoes as { id: string; descricao: string | null; tipo: string; proxima: string }[]) {
    if (m.proxima === "9999-12-31") continue;
    const dias = Math.round((new Date(`${m.proxima}T00:00:00`).getTime() - Date.now()) / 86400000);
    if (dias < 0 || dias > 35) continue;

    const jaExiste = await sql`
      SELECT 1 FROM empresa_alertas
      WHERE empresa_id = ${empresaId} AND manutencao_id = ${m.id} AND tipo = 'manutencao_proxima' AND resolvido = false
      LIMIT 1
    `;

    if ((jaExiste as unknown[]).length === 0) {
      await sql`
        INSERT INTO empresa_alertas (empresa_id, manutencao_id, tipo, mensagem)
        VALUES (${empresaId}, ${m.id}, 'manutencao_proxima', ${`Manutenção ${m.descricao ?? m.tipo} próxima (${dias} dia(s)).`})
      `;
      criados++;
    }
  }

  return criados;
}
