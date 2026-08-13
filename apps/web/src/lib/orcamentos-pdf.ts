import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { orcamentos, orcamentoItens, clientes, servicos, contasBancarias } from "@/db/schema";
import { EMPRESA } from "@/lib/empresa";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

/** Escapa dados vindos do banco antes de interpolá-los no HTML do PDF. */
function escapaHtml(valor: string | null | undefined): string {
  return (valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * `gerarPdfOrcamento` (a action) termina em `redirect()`, que aborta o fluxo
 * lançando uma exceção — não dá para chamá-la de dentro de outra action (ex.: para
 * "gerar-se-precisar e enviar"). Este core faz o mesmo trabalho sem redirecionar.
 */
export async function gerarPdfCore(orcamentoId: string): Promise<{ pdfCaminho: string }> {
  const [orcamento] = await db
    .select()
    .from(orcamentos)
    .where(eq(orcamentos.id, orcamentoId))
    .limit(1);
  if (!orcamento) throw new Error("Orçamento não encontrado");

  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, orcamento.clienteId))
    .limit(1);
  const [servico] = orcamento.servicoId
    ? await db.select().from(servicos).where(eq(servicos.id, orcamento.servicoId)).limit(1)
    : [];
  const [contaBancaria] = orcamento.contaBancariaId
    ? await db
        .select()
        .from(contasBancarias)
        .where(eq(contasBancarias.id, orcamento.contaBancariaId))
        .limit(1)
    : [];

  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, orcamentoId))
    .orderBy(asc(orcamentoItens.ordem));

  const descricaoItem = orcamento.descricao?.trim() || servico?.nome || "Serviço";

  const valorFormatado = Number(orcamento.valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const linhasItens = itens.length > 0
    ? itens
        .map((item) => {
          const preco = Number(item.valorUnitario).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
          const desconto = Number(item.desconto || "0");
          const descontoFormatado = desconto > 0
            ? desconto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
            : "—";
          const totalLinha = (Number(item.valorUnitario) * item.quantidade - desconto).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
          return `<tr><td>${item.quantidade}</td><td>Item ${item.ordem}</td><td>${escapaHtml(item.descricao)}</td><td>${preco}</td><td>${descontoFormatado}</td><td>${totalLinha}</td></tr>`;
        })
        .join("")
    : `<tr><td>1</td><td>Item 1</td><td>${escapaHtml(descricaoItem)}</td><td>${valorFormatado}</td><td>—</td><td>${valorFormatado}</td></tr>`;

  const dataEmissao = orcamento.criadoEm.toLocaleDateString("pt-BR");
  const validoAteFormatado = orcamento.validoAte
    ? new Date(`${orcamento.validoAte}T00:00:00`).toLocaleDateString("pt-BR")
    : null;
  const enderecoPartes = [
    cliente?.rua,
    cliente?.numero,
    cliente?.bairro,
    cliente?.cidade && cliente?.uf ? `${cliente.cidade} - ${cliente.uf}` : cliente?.cidade,
  ]
    .filter(Boolean)
    .join(", ");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 22px 26px; color: #001736; font-size: 11px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .brand h1 { margin: 0 0 4px; font-size: 24px; color: #002b5b; letter-spacing: 1.5px; }
  .brand p { margin: 2px 0; line-height: 1.35; }
  .numero-box { border: 1.5px solid #002b5b; border-radius: 6px; padding: 10px 16px; text-align: center; min-width: 160px; }
  .numero-box .label { font-size: 9px; font-weight: bold; color: #002b5b; }
  .numero-box .numero { font-size: 18px; font-weight: bold; color: #002b5b; margin: 3px 0; }
  .section { border: 1px solid #cbd5e1; border-radius: 6px; margin-bottom: 8px; overflow: hidden; page-break-inside: avoid; }
  .section-title { background: #002b5b; color: #fff; padding: 5px 12px; font-weight: bold; font-size: 10px; letter-spacing: 0.5px; }
  .section-body { padding: 8px 12px; }
  .section-body p { margin: 2px 0; line-height: 1.35; }
  table.itens { width: 100%; border-collapse: collapse; }
  table.itens th { background: #002b5b; color: #fff; text-align: left; padding: 5px 8px; font-size: 9px; }
  table.itens td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  table.itens tr.total td { background: #002b5b; color: #fff; font-weight: bold; }
  .footer { margin-top: 10px; text-align: center; font-size: 8px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; }
  .aviso-assinatura { margin-top: 18px; page-break-after: avoid; }
  .assinaturas { display: flex; justify-content: space-between; margin-top: 30px; gap: 32px; page-break-inside: avoid; }
  .assinatura-box { flex: 1; padding-top: 8px; text-align: center; }
  .assinatura-box .linha { border-top: 1.5px solid #001736; height: 0; }
  .assinatura-box p { margin: 3px 0; }
</style></head><body>

<div class="header">
  <div class="brand">
    <h1>${EMPRESA.nome}</h1>
    <p>${EMPRESA.razaoSocial}</p>
    <p>CNPJ: ${EMPRESA.cnpj}</p>
    <p>${EMPRESA.email}</p>
  </div>
  <div class="numero-box">
    <div class="label">ORÇAMENTO Nº</div>
    <div class="numero">${escapaHtml(orcamento.numero)}</div>
    <div>${dataEmissao}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">DADOS DO CONTRATANTE</div>
  <div class="section-body">
    <p><strong>Nome:</strong> ${escapaHtml(cliente?.nome) || "—"}</p>
    <p><strong>CPF/CNPJ:</strong> ${escapaHtml(cliente?.cpfCnpj) || "—"}</p>
    <p><strong>Endereço:</strong> ${escapaHtml(enderecoPartes) || "—"}</p>
    <p><strong>CEP:</strong> ${escapaHtml(cliente?.cep) || "—"}</p>
    <p><strong>Telefone:</strong> ${escapaHtml(cliente?.telefone ?? cliente?.celular) || "—"}</p>
    <p><strong>E-mail:</strong> ${escapaHtml(cliente?.email) || "—"}</p>
  </div>
</div>

<div class="section">
  <div class="section-title">ITENS DO ORÇAMENTO</div>
  <div class="section-body" style="padding:0">
    <table class="itens">
      <thead><tr><th>Qtd</th><th>Item</th><th>Descrição</th><th>Preço Unit.</th><th>Desc.</th><th>Total</th></tr></thead>
      <tbody>
        ${linhasItens}
        <tr class="total"><td colspan="5">VALOR TOTAL</td><td>${valorFormatado}</td></tr>
      </tbody>
    </table>
  </div>
</div>

${
  (orcamento.formaPagamento || orcamento.condicaoPagamento) &&
  `<div class="section"><div class="section-title">CONDIÇÕES DE PAGAMENTO</div><div class="section-body">
    ${orcamento.formaPagamento ? `<p><strong>Forma de pagamento:</strong> ${escapaHtml(orcamento.formaPagamento)}</p>` : ""}
    ${orcamento.condicaoPagamento ? `<p><strong>Condição:</strong> ${escapaHtml(orcamento.condicaoPagamento)}</p>` : ""}
  </div></div>`
}

${
  validoAteFormatado
    ? `<div class="section"><div class="section-title">VALIDADE</div><div class="section-body"><p>Esta proposta é válida até ${validoAteFormatado}.</p></div></div>`
    : ""
}

${
  orcamento.observacoes
    ? `<div class="section"><div class="section-title">OBSERVAÇÕES E CONDIÇÕES</div><div class="section-body"><p style="white-space:pre-wrap">${escapaHtml(orcamento.observacoes)}</p></div></div>`
    : ""
}

${
  contaBancaria
    ? `<div class="section"><div class="section-title">DADOS PARA PAGAMENTO</div><div class="section-body">
        <p><strong>Conta:</strong> ${escapaHtml(contaBancaria.apelido)}</p>
        ${contaBancaria.banco ? `<p><strong>Banco:</strong> ${escapaHtml(contaBancaria.banco)}</p>` : ""}
        ${contaBancaria.agencia ? `<p><strong>Agência:</strong> ${escapaHtml(contaBancaria.agencia)}</p>` : ""}
        ${contaBancaria.conta ? `<p><strong>Conta:</strong> ${escapaHtml(contaBancaria.conta)}</p>` : ""}
        ${contaBancaria.pix ? `<p><strong>PIX:</strong> ${escapaHtml(contaBancaria.pix)}</p>` : ""}
      </div></div>`
    : ""
}

<p class="aviso-assinatura">Para aceitar este orçamento, assine abaixo e devolva para o remetente.</p>

<div class="assinaturas">
  <div class="assinatura-box">
    <div class="linha"></div>
    <p>Assinatura do Contratante</p>
    <p><strong>${escapaHtml(cliente?.nome) ?? ""}</strong></p>
  </div>
  <div class="assinatura-box">
    <div class="linha"></div>
    <p>Assinatura — ${EMPRESA.nome} ${EMPRESA.razaoSocial}</p>
    <p><strong>CNPJ: ${EMPRESA.cnpj}</strong></p>
  </div>
</div>

<div class="footer">${EMPRESA.nome} ${EMPRESA.razaoSocial} | CNPJ: ${EMPRESA.cnpj}</div>

</body></html>`;

  const gotenbergUrl = process.env.GOTENBERG_URL ?? "http://gotenberg:3000";
  const body = new FormData();
  body.append("files", new Blob([html], { type: "text/html" }), "index.html");

  let res: Response;
  try {
    res = await fetch(`${gotenbergUrl}/forms/chromium/convert/html`, {
      method: "POST",
      body,
    });
  } catch {
    throw new Error(
      "Não foi possível gerar o PDF: serviço de conversão indisponível. Tente novamente em instantes."
    );
  }
  if (!res.ok) {
    throw new Error(`Falha ao gerar PDF do orçamento (serviço retornou erro ${res.status}).`);
  }

  const pdfBuffer = Buffer.from(await res.arrayBuffer());
  const orcamentosDir = path.join(uploadsDir(), "orcamentos");
  await mkdir(orcamentosDir, { recursive: true });
  const pdfNome = `${randomUUID()}.pdf`;
  const pdfCaminho = path.join("orcamentos", pdfNome);
  await writeFile(path.join(uploadsDir(), pdfCaminho), pdfBuffer);

  await db.update(orcamentos).set({ pdfCaminho }).where(eq(orcamentos.id, orcamentoId));

  return { pdfCaminho };
}

export async function lerPdfOrcamento(pdfCaminho: string): Promise<Buffer> {
  return readFile(path.join(uploadsDir(), pdfCaminho));
}
