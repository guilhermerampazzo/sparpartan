"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orcamentos, clientes, servicos, enviosEmail } from "@/db/schema";
import { aprovarOrcamentoCore, recusarOrcamentoCore } from "@/lib/orcamentos";
import { gerarPdfCore, lerPdfOrcamento } from "@/lib/orcamentos-pdf";
import { criarSolicitacao } from "@/lib/solicitacoes";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";
import { enviarEmail } from "@/lib/mail/adapter";
import { auth } from "@/lib/auth";

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
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!clienteId, "Selecione o cliente.")
    .exigir(!!servicoId || !!servicoLivreNome, "Selecione um serviço ou informe o nome do serviço avulso.")
    .exigir(!!valor && Number(valor) > 0, "Informe um valor válido.").erro;

  if (erro) return { erro, valores };

  const descricaoInformada = String(formData.get("descricao") ?? "").trim();
  const descricao = descricaoInformada || (!servicoId ? servicoLivreNome : "") || null;

  const session = await auth();
  const usuarioSessao = session?.user as { id?: string; tipo?: string } | undefined;
  const vendedorId = usuarioSessao?.tipo === "equipe" ? (usuarioSessao.id ?? null) : null;

  // gerarNumeroOrcamento faz count+1 sem lock — dois orçamentos criados no mesmo
  // instante podem colidir no UNIQUE de numero. Tenta de novo com número recalculado.
  const MAX_TENTATIVAS = 5;
  let orcamentoId: string | undefined;
  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    const numero = await gerarNumeroOrcamento();
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
          valor,
          descricao,
          observacoes: String(formData.get("observacoes") ?? "") || null,
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
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!clienteId, "Selecione o cliente.")
    .exigir(!!servicoId || !!servicoLivreNome, "Selecione um serviço ou informe o nome do serviço avulso.")
    .exigir(!!valor && Number(valor) > 0, "Informe um valor válido.").erro;

  if (erro) return { erro, valores };

  const [orcamentoAtual] = await db
    .select({ status: orcamentos.status })
    .from(orcamentos)
    .where(eq(orcamentos.id, orcamentoId))
    .limit(1);
  if (!orcamentoAtual) return { erro: "Orçamento não encontrado.", valores };
  if (orcamentoAtual.status !== "pendente") {
    return { erro: "Só é possível editar orçamentos com status pendente.", valores };
  }

  const descricaoInformada = String(formData.get("descricao") ?? "").trim();
  const descricao = descricaoInformada || (!servicoId ? servicoLivreNome : "") || null;

  await db
    .update(orcamentos)
    .set({
      clienteId,
      servicoId,
      embarcacaoId: String(formData.get("embarcacaoId") ?? "") || null,
      contaBancariaId: String(formData.get("contaBancariaId") ?? "") || null,
      valor,
      descricao,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      validoAte: String(formData.get("validoAte") ?? "") || null,
      pdfCaminho: null,
    })
    .where(eq(orcamentos.id, orcamentoId));

  redirect(`/orcamentos/${orcamentoId}`);
}

export async function excluirOrcamento(orcamentoId: string) {
  await db
    .update(orcamentos)
    .set({ excluidoEm: new Date() })
    .where(eq(orcamentos.id, orcamentoId));
  redirect("/orcamentos");
}

export async function gerarPdfOrcamento(orcamentoId: string) {
  try {
    await gerarPdfCore(orcamentoId);
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

  redirect(`/orcamentos/${orcamentoId}`);
}

export async function aprovarOrcamento(orcamentoId: string) {
  const resultado = await aprovarOrcamentoCore(orcamentoId);
  if (!resultado.ok) throw new Error(`Não foi possível aprovar (${resultado.motivo})`);
  redirect(`/orcamentos/${orcamentoId}`);
}

export async function recusarOrcamento(orcamentoId: string) {
  const resultado = await recusarOrcamentoCore(orcamentoId);
  if (!resultado.ok) throw new Error(`Não foi possível recusar (${resultado.motivo})`);
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
  redirect(`/orcamentos/${orcamentoId}?link=${token}`);
}
