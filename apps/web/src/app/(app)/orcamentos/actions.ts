"use server";

import { redirect } from "next/navigation";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orcamentos, orcamentoItens, clientes, servicos, contasBancarias, enviosEmail } from "@/db/schema";
import { aprovarOrcamentoCore, recusarOrcamentoCore } from "@/lib/orcamentos";
import { gerarPdfCore, lerPdfOrcamento } from "@/lib/orcamentos-pdf";
import { criarSolicitacao } from "@/lib/solicitacoes";
import { registrarNoChat } from "@/lib/chat-sistema";
import { criarPendencia } from "@/lib/pendencias-db";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";
import { enviarEmail } from "@/lib/mail/adapter";
import { auth } from "@/lib/auth";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

/** Remove o PDF do disco quando o orçamento é editado/regenerado/excluído — evita acumular arquivos órfãos. */
async function apagarPdfDoDisco(pdfCaminho: string | null) {
  if (!pdfCaminho) return;
  try {
    await unlink(path.join(uploadsDir(), pdfCaminho));
  } catch {
    // arquivo já não existe — sem problema
  }
}

const MAX_ITENS = 20;

type ItemOrcamento = { descricao: string; quantidade: number; valorUnitario: string; desconto: string };

function itensDoFormData(formData: FormData): ItemOrcamento[] {
  const itens: ItemOrcamento[] = [];
  for (let i = 0; i < MAX_ITENS; i++) {
    const descricao = String(formData.get(`itemDescricao${i}`) ?? "").trim();
    const valorUnitario = String(formData.get(`itemValor${i}`) ?? "").trim();
    if (!descricao && !valorUnitario) continue;
    const quantidade = Number(formData.get(`itemQuantidade${i}`) ?? "1");
    const desconto = String(formData.get(`itemDesconto${i}`) ?? "").trim();
    itens.push({
      descricao: descricao || `Item ${i + 1}`,
      quantidade: Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1,
      valorUnitario: valorUnitario || "0",
      desconto: Number.isFinite(Number(desconto)) && Number(desconto) > 0 ? Number(desconto).toFixed(2) : "0",
    });
  }
  return itens;
}

function totalDeItens(itens: ItemOrcamento[]): string {
  const total = itens.reduce(
    (acc, item) => acc + Number(item.valorUnitario) * item.quantidade - Number(item.desconto || "0"),
    0
  );
  return Math.max(0, total).toFixed(2);
}

async function gerarNumeroOrcamento(): Promise<string> {
  const agora = new Date();
  const mm = String(agora.getMonth() + 1).padStart(2, "0");
  const aa = String(agora.getFullYear()).slice(-2);
  const prefixo = `${mm}${aa}`;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orcamentos)
    .where(sql`${orcamentos.numero} like ${prefixo + "%"}`);

  const sequencial = String(count + 1).padStart(3, "0");
  return `${prefixo}${sequencial}`;
}

export async function criarOrcamento(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const clienteId = String(formData.get("clienteId") ?? "");
  const servicoId = String(formData.get("servicoId") ?? "") || null;
  const servicoLivreNome = String(formData.get("servicoLivreNome") ?? "").trim();
  const valor = String(formData.get("valor") ?? "");
  const itens = itensDoFormData(formData);
  const valores = valoresDoFormData(formData);

  const totalItens = itens.length > 0 ? Number(totalDeItens(itens)) : null;
  const temValor = totalItens !== null ? totalItens > 0 : Number(valor) > 0;

  const erro = new Validador()
    .exigir(!!clienteId, "Selecione o cliente.")
    .exigir(!!servicoId || !!servicoLivreNome, "Selecione um serviço ou informe o nome do serviço avulso.")
    .exigir(
      !!temValor,
      totalItens !== null
        ? "Informe valores válidos nos itens do orçamento."
        : "Informe um valor válido."
    ).erro;

  if (erro) return { erro, valores };

  const descricaoInformada = String(formData.get("descricao") ?? "").trim();
  const descricao =
    itens.length > 0 ? null : descricaoInformada || (!servicoId ? servicoLivreNome : "") || null;

  const session = await auth();
  const usuarioSessao = session?.user as { id?: string; tipo?: string } | undefined;
  const vendedorId = usuarioSessao?.tipo === "equipe" ? (usuarioSessao.id ?? null) : null;

  // gerarNumeroOrcamento faz count+1 sem lock — dois orçamentos criados no mesmo
  // instante podem colidir no UNIQUE de numero. Tenta de novo com número recalculado.
  const MAX_TENTATIVAS = 5;
  let orcamentoId: string | undefined;
  let numero = "";
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    numero = await gerarNumeroOrcamento();
    try {
      const [orcamento] = await db
        .insert(orcamentos)
        .values({
          numero,
          clienteId,
          servicoId,
          embarcacaoId: String(formData.get("embarcacaoId") ?? "") || null,
          vendedorId,
          contaBancariaId: String(formData.get("contaBancariaId") ?? "") || null,
          valor: totalItens !== null ? totalItens.toFixed(2) : valor,
          descricao,
          observacoes: String(formData.get("observacoes") ?? "") || null,
          formaPagamento: String(formData.get("formaPagamento") ?? "").trim() || null,
          condicaoPagamento: String(formData.get("condicaoPagamento") ?? "").trim() || null,
          validoAte: String(formData.get("validoAte") ?? "") || null,
          criadoPorId: vendedorId,
        })
        .returning({ id: orcamentos.id });
      orcamentoId = orcamento.id;
      break;
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      if (!mensagem.includes("orcamentos_numero_unique") || tentativa === MAX_TENTATIVAS - 1) {
        throw e;
      }
    }
  }

  if (orcamentoId && itens.length > 0) {
    await db
      .insert(orcamentoItens)
      .values(
        itens.map((item, i) => ({
          orcamentoId: orcamentoId!,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          desconto: item.desconto,
          ordem: i + 1,
        }))
      );
  }

  const [clienteDoOrcamento] = await db
    .select({ nome: clientes.nome })
    .from(clientes)
    .where(eq(clientes.id, clienteId))
    .limit(1);
  await registrarNoChat(
    `Orçamento ${numero} criado para ${clienteDoOrcamento?.nome ?? "cliente"} — aguardando análise.`
  );

  // A Central de Pendências é alimentada automaticamente pelos módulos: um
  // orçamento criado gera a tarefa de decisão sem ninguém cadastrar na mão.
  await criarPendencia({
    descricao: `Orçamento ${numero} aguardando aprovação`,
    categoria: "financeiro",
    prioridade: "media",
    data: new Date().toISOString().slice(0, 10),
    clienteId,
    responsavelId: vendedorId,
    origem: "auto",
    criadoPorId: vendedorId,
  });

  await registrarAuditoria("criar", "orcamento", orcamentoId!, numero);
  redirect(`/orcamentos/${orcamentoId}`);
}

export async function atualizarOrcamento(
  orcamentoId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const clienteId = String(formData.get("clienteId") ?? "");
  const servicoId = String(formData.get("servicoId") ?? "") || null;
  const servicoLivreNome = String(formData.get("servicoLivreNome") ?? "").trim();
  const valor = String(formData.get("valor") ?? "");
  const itens = itensDoFormData(formData);
  const valores = valoresDoFormData(formData);

  const totalItens = itens.length > 0 ? Number(totalDeItens(itens)) : null;
  const temValor = totalItens !== null ? totalItens > 0 : Number(valor) > 0;

  const erro = new Validador()
    .exigir(!!clienteId, "Selecione o cliente.")
    .exigir(!!servicoId || !!servicoLivreNome, "Selecione um serviço ou informe o nome do serviço avulso.")
    .exigir(
      !!temValor,
      totalItens !== null
        ? "Informe valores válidos nos itens do orçamento."
        : "Informe um valor válido."
    ).erro;

  if (erro) return { erro, valores };

  const [orcamentoAtual] = await db
    .select({ status: orcamentos.status, pdfCaminho: orcamentos.pdfCaminho, numero: orcamentos.numero })
    .from(orcamentos)
    .where(eq(orcamentos.id, orcamentoId))
    .limit(1);
  if (!orcamentoAtual) return { erro: "Orçamento não encontrado.", valores };
  if (orcamentoAtual.status !== "pendente") {
    return { erro: "Só é possível editar orçamentos com status pendente.", valores };
  }

  const descricaoInformada = String(formData.get("descricao") ?? "").trim();
  const descricao =
    itens.length > 0 ? null : descricaoInformada || (!servicoId ? servicoLivreNome : "") || null;

  // O PDF antigo ficaria desatualizado e ninguém apagaria o arquivo — remove do disco
  // junto com a referência.
  await apagarPdfDoDisco(orcamentoAtual.pdfCaminho);

  await db
    .update(orcamentos)
    .set({
      clienteId,
      servicoId,
      embarcacaoId: String(formData.get("embarcacaoId") ?? "") || null,
      contaBancariaId: String(formData.get("contaBancariaId") ?? "") || null,
      valor: totalItens !== null ? totalItens.toFixed(2) : valor,
      descricao,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      formaPagamento: String(formData.get("formaPagamento") ?? "").trim() || null,
      condicaoPagamento: String(formData.get("condicaoPagamento") ?? "").trim() || null,
      validoAte: String(formData.get("validoAte") ?? "") || null,
      pdfCaminho: null,
    })
    .where(eq(orcamentos.id, orcamentoId));

  await db.delete(orcamentoItens).where(eq(orcamentoItens.orcamentoId, orcamentoId));
  if (itens.length > 0) {
    await db
      .insert(orcamentoItens)
      .values(
        itens.map((item, i) => ({
          orcamentoId,
          descricao: item.descricao,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          desconto: item.desconto,
          ordem: i + 1,
        }))
      );
  }

  await registrarAuditoria("atualizar", "orcamento", orcamentoId, orcamentoAtual.numero);
  redirect(`/orcamentos/${orcamentoId}`);
}

export async function excluirOrcamento(orcamentoId: string) {
  const [orcamento] = await db
    .select({ pdfCaminho: orcamentos.pdfCaminho, numero: orcamentos.numero })
    .from(orcamentos)
    .where(eq(orcamentos.id, orcamentoId))
    .limit(1);

  await apagarPdfDoDisco(orcamento?.pdfCaminho ?? null);

  await db
    .update(orcamentos)
    .set({ excluidoEm: new Date() })
    .where(eq(orcamentos.id, orcamentoId));
  await registrarAuditoria("excluir", "orcamento", orcamentoId, orcamento?.numero ?? undefined);
  redirect("/orcamentos");
}

export async function removerPdfOrcamento(orcamentoId: string) {
  const [orcamento] = await db
    .select({ pdfCaminho: orcamentos.pdfCaminho })
    .from(orcamentos)
    .where(eq(orcamentos.id, orcamentoId))
    .limit(1);
  if (!orcamento) throw new Error("Orçamento não encontrado");

  await apagarPdfDoDisco(orcamento.pdfCaminho);
  await db
    .update(orcamentos)
    .set({ pdfCaminho: null })
    .where(eq(orcamentos.id, orcamentoId));

  redirect(`/orcamentos/${orcamentoId}`);
}

export async function gerarPdfOrcamento(orcamentoId: string) {
  try {
    await gerarPdfCore(orcamentoId);
    await registrarAuditoria("atualizar", "orcamento", orcamentoId, "PDF gerado");
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Falha ao gerar PDF do orçamento.";
    redirect(`/orcamentos/${orcamentoId}?erro=${encodeURIComponent(mensagem)}`);
  }
  redirect(`/orcamentos/${orcamentoId}`);
}

export async function enviarOrcamentoPorEmail(orcamentoId: string) {
  const [orcamento] = await db.select().from(orcamentos).where(eq(orcamentos.id, orcamentoId)).limit(1);
  if (!orcamento) throw new Error("Orçamento não encontrado");

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, orcamento.clienteId)).limit(1);
  if (!cliente?.email) throw new Error("Cliente não possui e-mail cadastrado");

  const [servico] = orcamento.servicoId
    ? await db.select().from(servicos).where(eq(servicos.id, orcamento.servicoId)).limit(1)
    : [];

  let pdfCaminho: string;
  try {
    pdfCaminho = orcamento.pdfCaminho ?? (await gerarPdfCore(orcamentoId)).pdfCaminho;
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : "Falha ao gerar PDF do orçamento.";
    redirect(`/orcamentos/${orcamentoId}?erro=${encodeURIComponent(mensagem)}`);
  }
  const pdfBuffer = await lerPdfOrcamento(pdfCaminho);

  const valorFormatado = Number(orcamento.valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const assunto = `Orçamento ${orcamento.numero} — Sparapan`;
  const html = `<p>Olá ${cliente.nome},</p>
    <p>Segue em anexo o orçamento <strong>${orcamento.numero}</strong> — ${servico?.nome ?? "serviço"},
    no valor de <strong>${valorFormatado}</strong>.</p>
    <p>Sparapan Solução Naval</p>`;

  let status: "enviado" | "falhou" = "enviado";
  let erro: string | null = null;
  try {
    await enviarEmail({
      to: cliente.email,
      subject: assunto,
      html,
      attachments: [{ filename: `orcamento-${orcamento.numero}.pdf`, content: pdfBuffer }],
    });
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

  if (status === "falhou") throw new Error(`Falha ao enviar e-mail: ${erro}`);

  await registrarAuditoria("atualizar", "orcamento", orcamentoId, `e-mail enviado para ${cliente.email}`);
  redirect(`/orcamentos/${orcamentoId}`);
}

export async function aprovarOrcamento(orcamentoId: string) {
  const resultado = await aprovarOrcamentoCore(orcamentoId);
  if (!resultado.ok) throw new Error(`Não foi possível aprovar (${resultado.motivo})`);
  await registrarAuditoria("alterar_status", "orcamento", orcamentoId, "aprovado");
  redirect(`/orcamentos/${orcamentoId}`);
}

export async function recusarOrcamento(orcamentoId: string) {
  const resultado = await recusarOrcamentoCore(orcamentoId);
  if (!resultado.ok) throw new Error(`Não foi possível recusar (${resultado.motivo})`);
  await registrarAuditoria("alterar_status", "orcamento", orcamentoId, "recusado");
  redirect(`/orcamentos/${orcamentoId}`);
}

export async function gerarLinkAprovacao(orcamentoId: string) {
  const [orcamento] = await db.select().from(orcamentos).where(eq(orcamentos.id, orcamentoId)).limit(1);
  if (!orcamento) throw new Error("Orçamento não encontrado");

  const token = await criarSolicitacao({
    tipo: "aprovacao_orcamento",
    orcamentoId,
    clienteId: orcamento.clienteId,
  });
  await registrarAuditoria("criar", "solicitacao_aprovacao", orcamentoId, `link gerado: ${token}`);
  redirect(`/orcamentos/${orcamentoId}?link=${token}`);
}

export type EstadoContaRapida =
  | { erro: string; valores?: Record<string, string> }
  | { erro?: undefined; conta: { id: string; apelido: string } }
  | null;

/** Cria a conta bancária direto do formulário do orçamento — devolve o registro criado. */
export async function criarContaBancariaRapida(
  _estadoAnterior: EstadoContaRapida,
  formData: FormData
): Promise<EstadoContaRapida> {
  const apelido = String(formData.get("contaNovoApelido") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!apelido, "Informe um apelido para a conta.").erro;
  if (erro) return { erro, valores };

  const [conta] = await db
    .insert(contasBancarias)
    .values({
      apelido,
      banco: String(formData.get("contaNovoBanco") ?? "").trim() || null,
      agencia: String(formData.get("contaNovoAgencia") ?? "").trim() || null,
      conta: String(formData.get("contaNovoNumero") ?? "").trim() || null,
      pix: String(formData.get("contaNovoPix") ?? "").trim() || null,
    })
    .returning({ id: contasBancarias.id, apelido: contasBancarias.apelido });

  await registrarAuditoria("criar", "conta_bancaria", conta.id, apelido);
  return { conta };
}
