import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orcamentos, servicosContratados, processos, pagamentos, clientes, servicos, enviosEmail } from "@/db/schema";
import { enviarEmail } from "@/lib/mail/adapter";
import { reclassificarProcesso } from "@/lib/processos";

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
export async function aprovarOrcamentoCore(orcamentoId: string): Promise<ResultadoAprovacao> {
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

  const [processo] = await db
    .insert(processos)
    .values({
      clienteId: orcamento.clienteId,
      servicoId: orcamento.servicoId,
      embarcacaoId: orcamento.embarcacaoId,
      criadoPorId: orcamento.criadoPorId,
    })
    .returning({ id: processos.id });

  const [venda] = await db
    .insert(servicosContratados)
    .values({
      orcamentoId,
      clienteId: orcamento.clienteId,
      servicoId: orcamento.servicoId,
      processoId: processo.id,
      vendedorId: orcamento.vendedorId,
      valor: orcamento.valor,
      dataContratacao: new Date().toISOString().slice(0, 10),
      criadoPorId: orcamento.criadoPorId,
    })
    .returning({ id: servicosContratados.id });

  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + PRAZO_PAGAMENTO_DIAS);

  await db.insert(pagamentos).values({
    servicoContratadoId: venda.id,
    valor: orcamento.valor,
    dataVencimento: vencimento.toISOString().slice(0, 10),
    status: "pendente",
  });

  await db.update(orcamentos).set({ status: "aprovado" }).where(eq(orcamentos.id, orcamentoId));

  await reclassificarProcesso(processo.id);

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, orcamento.clienteId)).limit(1);
  const [servico] = await db.select().from(servicos).where(eq(servicos.id, orcamento.servicoId)).limit(1);

  // Contratar um curso da escola promove a classificação do cliente para
  // aluno/ambos automaticamente — mantém o campo honesto sem manutenção manual.
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

  return { ok: true, processoId: processo.id };
}

export async function recusarOrcamentoCore(orcamentoId: string): Promise<ResultadoAprovacao> {
  const [orcamento] = await db.select().from(orcamentos).where(eq(orcamentos.id, orcamentoId)).limit(1);
  if (!orcamento) return { ok: false, motivo: "nao_encontrado" };
  if (orcamento.status !== "pendente") return { ok: true };

  await db.update(orcamentos).set({ status: "recusado" }).where(eq(orcamentos.id, orcamentoId));
  return { ok: true };
}
