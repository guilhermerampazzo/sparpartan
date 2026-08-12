import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orcamentos, servicosContratados, processos, pagamentos, clientes, servicos, enviosEmail, pipelineOportunidades, pipelineHistorico, pendencias } from "@/db/schema";
import { enviarEmail } from "@/lib/mail/adapter";
import { reclassificarProcesso } from "@/lib/processos";
import { registrarNoChat } from "@/lib/chat-sistema";
import { registrarAuditoria } from "@/lib/audit";

export type ResultadoAprovacao =
  | { ok: true; processoId?: string }
  | { ok: false; motivo: "nao_encontrado" | "vencido" | "ja_decidido" | "sem_servico_cadastrado" };

/** Dias até o vencimento da cobrança gerada ao aprovar um orçamento. */
const PRAZO_PAGAMENTO_DIAS = 15;

/**
 * Idempotente: aprovar duas vezes não gera duas vendas nem lança erro.
 *
 * Aprovar não é só mudar um status — é o momento em que o trabalho começa. Por isso
 * abre o processo (herdando cliente/serviço/embarcação do orçamento, que o operador
 * antes tinha que re-selecionar à mão), vincula a venda a ele (`processoId` antes
 * nascia e morria null), gera a cobrança e avisa o cliente.
 */
export async function aprovarOrcamentoCore(
  orcamentoId: string,
  usuarioNome?: string
): Promise<ResultadoAprovacao> {
  const [orcamento] = await db.select().from(orcamentos).where(eq(orcamentos.id, orcamentoId)).limit(1);
  if (!orcamento) return { ok: false, motivo: "nao_encontrado" };

  if (orcamento.status === "aprovado") return { ok: true };
  if (orcamento.status === "recusado" || orcamento.status === "expirado") {
    return { ok: false, motivo: "ja_decidido" };
  }

  if (orcamento.validoAte && new Date(orcamento.validoAte) < new Date()) {
    await db.update(orcamentos).set({ status: "expirado" }).where(eq(orcamentos.id, orcamentoId));
    return { ok: false, motivo: "vencido" };
  }

  // Orçamento com serviço avulso (só descrição em texto, sem vínculo com o catálogo)
  // não tem como abrir processo/venda, que exigem servicoId — edite o orçamento e
  // escolha um serviço da lista antes de aprovar.
  if (!orcamento.servicoId) {
    return { ok: false, motivo: "sem_servico_cadastrado" };
  }

  // Captura fora da closure da transação: o narrowing de `orcamento.servicoId`
  // feito pelo guard acima não sobrevive ao entrar num callback, e o type do
  // insert de processos exige servicoId não-nulo.
  const { clienteId, servicoId, embarcacaoId, vendedorId, criadoPorId, valor } = orcamento;

  // As escritas ficam numa transação: se qualquer uma falhar no meio, nada é
  // persistido e aprovar de novo não gera processo/venda duplicados.
  const { processoId } = await db.transaction(async (tx) => {
    const [processo] = await tx
      .insert(processos)
      .values({
        clienteId,
        servicoId,
        embarcacaoId,
        criadoPorId,
      })
      .returning({ id: processos.id });

    const [venda] = await tx
      .insert(servicosContratados)
      .values({
        orcamentoId,
        clienteId,
        servicoId,
        processoId: processo.id,
        vendedorId,
        valor,
        dataContratacao: new Date().toISOString().slice(0, 10),
        criadoPorId,
      })
      .returning({ id: servicosContratados.id });

    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + PRAZO_PAGAMENTO_DIAS);

    await tx.insert(pagamentos).values({
      servicoContratadoId: venda.id,
      valor,
      dataVencimento: vencimento.toISOString().slice(0, 10),
      status: "pendente",
    });

    await tx.update(orcamentos).set({ status: "aprovado" }).where(eq(orcamentos.id, orcamentoId));

    await reclassificarProcesso(processo.id, tx);

    return { processoId: processo.id };
  });

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, orcamento.clienteId)).limit(1);
  const [servico] = await db.select().from(servicos).where(eq(servicos.id, orcamento.servicoId)).limit(1);

  // Contratar um curso da escola promove a classificação do cliente para
  // aluno/ambos automaticamente — mantém o campo honesto sem manutenção manual.
  // (Fora da transação de propósito: falha aqui não deve desfazer a aprovação.)
  if (servico?.categoria === "escola" && cliente && cliente.classificacao === "cliente") {
    await db.update(clientes).set({ classificacao: "ambos" }).where(eq(clientes.id, cliente.id));
  }

  if (cliente?.email) {
    const valorFormatado = Number(orcamento.valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    const assunto = `Orçamento ${orcamento.numero} aprovado — Sparapan`;
    const html = `<p>Olá ${cliente.nome},</p>
               <p>Confirmamos a aprovação do orçamento <strong>${orcamento.numero}</strong> —
               ${servico?.nome ?? "serviço"}, no valor de <strong>${valorFormatado}</strong>.</p>
               <p>Já abrimos o processo e vamos entrar em contato com os próximos passos.</p>
               <p>Sparapan Solução Naval</p>`;

    let status: "enviado" | "falhou" = "enviado";
    let erro: string | null = null;
    try {
      await enviarEmail({ to: cliente.email, subject: assunto, html });
    } catch (e) {
      status = "falhou";
      erro = e instanceof Error ? e.message : String(e);
    }

    await db.insert(enviosEmail).values({
      clienteId: cliente.id,
      orcamentoId,
      destinatario: cliente.email,
      assunto,
      corpo: html,
      status,
      erro,
    });
  }

  await registrarNoChat(
    `Orçamento ${orcamento.numero} aprovado — ${servico?.nome ?? "serviço"} de ${cliente?.nome ?? "cliente"}. Processo aberto.`
  );

  await registrarAuditoria(
    "alterar_status",
    "orcamento",
    orcamentoId,
    `aprovado — processo ${processoId} aberto`,
    usuarioNome
  );

  // Reflexo no Pipeline Comercial: a oportunidade vinculada a este orçamento
  // avança para "serviço contratado" — sem ninguém arrastar o cartão à mão.
  const [oportunidade] = await db
    .select({ id: pipelineOportunidades.id, estagio: pipelineOportunidades.estagio })
    .from(pipelineOportunidades)
    .where(eq(pipelineOportunidades.orcamentoId, orcamentoId))
    .limit(1);

  if (oportunidade && oportunidade.estagio !== "servico_contratado" && oportunidade.estagio !== "concluido" && oportunidade.estagio !== "perdido") {
    await db
      .update(pipelineOportunidades)
      .set({ estagio: "servico_contratado", atualizadoEm: new Date() })
      .where(eq(pipelineOportunidades.id, oportunidade.id));

    await db.insert(pipelineHistorico).values({
      oportunidadeId: oportunidade.id,
      estagioAnterior: oportunidade.estagio,
      estagioNovo: "servico_contratado",
      usuarioId: null,
    });

    await registrarAuditoria(
      "alterar_status",
      "oportunidade",
      oportunidade.id,
      `${oportunidade.estagio} → servico_contratado (aprovação do orçamento ${orcamento.numero})`,
      usuarioNome
    );
  }

  // Reflexo na Central de Pendências: a pendência de decisão do orçamento
  // criada no criarOrcamento deixa de fazer sentido — resolve sozinha.
  const [pendencia] = await db
    .select({ id: pendencias.id })
    .from(pendencias)
    .where(
      and(
        eq(pendencias.clienteId, orcamento.clienteId),
        eq(pendencias.status, "pendente"),
        eq(pendencias.origem, "auto"),
        eq(pendencias.descricao, `Orçamento ${orcamento.numero} aguardando aprovação`)
      )
    )
    .limit(1);

  if (pendencia) {
    await db
      .update(pendencias)
      .set({ status: "concluida", concluidaEm: new Date() })
      .where(eq(pendencias.id, pendencia.id));
    await registrarAuditoria(
      "alterar_status",
      "pendencia",
      pendencia.id,
      "concluída automaticamente (orçamento aprovado)",
      usuarioNome
    );
  }

  return { ok: true, processoId };
}

export async function recusarOrcamentoCore(
  orcamentoId: string,
  usuarioNome?: string
): Promise<ResultadoAprovacao> {
  const [orcamento] = await db.select().from(orcamentos).where(eq(orcamentos.id, orcamentoId)).limit(1);
  if (!orcamento) return { ok: false, motivo: "nao_encontrado" };
  if (orcamento.status !== "pendente") return { ok: true };

  await db.update(orcamentos).set({ status: "recusado" }).where(eq(orcamentos.id, orcamentoId));
  await registrarAuditoria("alterar_status", "orcamento", orcamentoId, "recusado", usuarioNome);
  return { ok: true };
}
