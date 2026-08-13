import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { lojaOrcamentos, lojaOrcamentoItens, lojaProdutos, lojaProdutoFotos, clientes, usuarios } from "@/db/schema";
import { uploadsDir } from "@/lib/storage";
import { formatarDataBR } from "@/lib/datas";

export async function gerarPdfOrcamentoLoja(orcamentoId: string): Promise<{ pdfCaminho: string }> {
  const [orcamento] = await db.select().from(lojaOrcamentos).where(eq(lojaOrcamentos.id, orcamentoId)).limit(1);
  if (!orcamento) throw new Error("Orçamento não encontrado");

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, orcamento.clienteId)).limit(1);
  const [vendedor] = orcamento.vendedorId
    ? await db.select().from(usuarios).where(eq(usuarios.id, orcamento.vendedorId)).limit(1)
    : [];

  const itens = await db.select().from(lojaOrcamentoItens).where(eq(lojaOrcamentoItens.orcamentoId, orcamentoId));
  const fotos = await db.select().from(lojaProdutoFotos).orderBy(lojaProdutoFotos.criadoEm);

  const linhas = itens
    .map((item) => {
      const foto = fotos.find((f) => f.produtoId === item.produtoId);
      const preco = Number(item.precoUnitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const totalItem = (item.quantidade * Number(item.precoUnitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      return `
        <tr>
          ${foto ? `<td class="foto"><img src="/tmp/foto-${item.produtoId}.jpg" /></td>` : `<td class="foto"></td>`}
          <td>${item.descricao}</td>
          <td class="num">${item.quantidade}</td>
          <td class="num">${preco}</td>
          <td class="num">${totalItem}</td>
        </tr>`;
    })
    .join("");

  const desconto = Number(orcamento.desconto ?? 0);
  const frete = Number(orcamento.frete ?? 0);

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 24px 28px; color: #001736; font-size: 11px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #001789; padding-bottom: 12px; margin-bottom: 14px; }
  .logo { font-size: 20px; font-weight: bold; color: #001789; }
  .dados-empresa { text-align: right; font-size: 10px; color: #444; }
  .titulo { font-size: 16px; font-weight: bold; color: #001789; margin: 10px 0 4px; }
  .cliente { font-size: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #001789; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; }
  td { border-bottom: 1px solid #ddd; padding: 6px 8px; vertical-align: middle; }
  .num { text-align: right; white-space: nowrap; }
  .foto { width: 46px; }
  .foto img { width: 42px; height: 42px; object-fit: cover; border-radius: 4px; }
  .totais { margin-top: 10px; text-align: right; }
  .totais p { margin: 2px 0; }
  .total { font-size: 15px; font-weight: bold; color: #001789; }
  .rodape { margin-top: 18px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9px; color: #666; display: flex; justify-content: space-between; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">SPARAPAN<br /><span style="font-size:10px;font-weight:normal">Solução Naval</span></div>
    <div class="dados-empresa">
      ORÇAMENTO DA LOJA<br />
      Nº ${orcamento.numero}<br />
      ${formatarDataBR(new Date())}
    </div>
  </div>
  <div class="titulo">Proposta comercial</div>
  <p class="cliente">
    <strong>Cliente:</strong> ${cliente?.nome ?? "—"}${cliente?.cpfCnpj ? ` · ${cliente.cpfCnpj}` : ""}<br />
    ${vendedor ? `<strong>Vendedor:</strong> ${vendedor.nome}` : ""}
    ${orcamento.validade ? ` · <strong>Validade:</strong> ${formatarDataBR(orcamento.validade)}` : ""}
    ${orcamento.formaPagamento ? ` · <strong>Pagamento:</strong> ${orcamento.formaPagamento}` : ""}
  </p>
  <table>
    <thead><tr><th>Foto</th><th>Produto</th><th>Qtd</th><th>Valor unit.</th><th>Total</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="totais">
    <p>Subtotal: ${Number(orcamento.valorTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
    ${desconto > 0 ? `<p>Desconto: −${desconto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>` : ""}
    ${frete > 0 ? `<p>Frete: ${frete.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>` : ""}
    <p class="total">Total: ${orcamento.valorTotal ? Number(orcamento.valorTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</p>
  </div>
  ${orcamento.observacoes ? `<p style="margin-top:8px;font-size:10px"><strong>Observações:</strong> ${orcamento.observacoes}</p>` : ""}
  <div class="rodape">
    <span>Sparapan Solução Naval</span>
    <span>Gerado em ${formatarDataBR(new Date(), { comHora: true })}</span>
  </div>
</body>
</html>`;

  const gotenbergUrl = process.env.GOTENBERG_URL ?? "http://gotenberg:3000";
  const form = new FormData();
  form.append("index.html", new Blob([html], { type: "text/html" }), "index.html");

  // Anexa as fotos dos produtos no diretório de assets do Gotenberg (/tmp).
  const fotoIds = new Set<string>();
  for (const item of itens) {
    const foto = fotos.find((f) => f.produtoId === item.produtoId);
    if (foto) fotoIds.add(foto.id);
  }
  for (const fotoId of fotoIds) {
    const [foto] = await db.select().from(lojaProdutoFotos).where(eq(lojaProdutoFotos.id, fotoId)).limit(1);
    if (!foto) continue;
    const buffer = await readArquivo(path.join(uploadsDir(), foto.caminho));
    if (buffer) {
      form.append("files", new Blob([new Uint8Array(buffer)]), `foto-${foto.produtoId}.jpg`);
    }
  }

  const res = await fetch(`${gotenbergUrl}/forms/chromium/convert/html`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Gotenberg: ${res.status}`);

  const bytes = Buffer.from(await res.arrayBuffer());
  const dir = path.join(uploadsDir(), "loja", "orcamentos");
  await mkdir(dir, { recursive: true });
  const pdfCaminho = path.join("loja", "orcamentos", `${orcamento.numero}.pdf`);
  await writeFile(path.join(uploadsDir(), pdfCaminho), bytes);
  return { pdfCaminho };
}

async function readArquivo(caminho: string): Promise<Buffer | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    return await readFile(caminho);
  } catch {
    return null;
  }
}

/** PDF do pedido de compra — logo Sparapan, fornecedor, itens, condições. */
export async function gerarPdfPedidoCompra(compraId: string): Promise<{ pdfCaminho: string }> {
  const { lojaCompras, lojaCompraItens, lojaFornecedores, lojaProdutos } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const [compra] = await db.select().from(lojaCompras).where(eq(lojaCompras.id, compraId)).limit(1);
  if (!compra) throw new Error("Pedido não encontrado");
  const [fornecedor] = await db.select().from(lojaFornecedores).where(eq(lojaFornecedores.id, compra.fornecedorId)).limit(1);

  const itens = await db
    .select({
      quantidade: lojaCompraItens.quantidade,
      precoUnitario: lojaCompraItens.precoUnitario,
      produtoNome: lojaProdutos.nome,
    })
    .from(lojaCompraItens)
    .innerJoin(lojaProdutos, eq(lojaCompraItens.produtoId, lojaProdutos.id))
    .where(eq(lojaCompraItens.compraId, compraId));

  const linhas = itens
    .map((item) => {
      const preco = Number(item.precoUnitario).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const total = (item.quantidade * Number(item.precoUnitario)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      return `<tr><td>${item.produtoNome}</td><td class="num">${item.quantidade}</td><td class="num">${preco}</td><td class="num">${total}</td></tr>`;
    })
    .join("");

  const totalGeral = itens.reduce((acc, i) => acc + i.quantidade * Number(i.precoUnitario), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 24px 28px; color: #001736; font-size: 11px; }
  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #001789; padding-bottom: 12px; margin-bottom: 14px; }
  .logo { font-size: 20px; font-weight: bold; color: #001789; }
  .dados { text-align: right; font-size: 10px; color: #444; }
  .titulo { font-size: 16px; font-weight: bold; color: #001789; margin: 10px 0 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #001789; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; }
  td { border-bottom: 1px solid #ddd; padding: 6px 8px; }
  .num { text-align: right; white-space: nowrap; }
  .total { margin-top: 10px; text-align: right; font-size: 14px; font-weight: bold; color: #001789; }
  .rodape { margin-top: 18px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9px; color: #666; }
</style></head>
<body>
  <div class="header">
    <div class="logo">SPARAPAN<br /><span style="font-size:10px;font-weight:normal">Solução Naval</span></div>
    <div class="dados">PEDIDO DE COMPRA<br />Nº ${compra.numero}<br />${formatarDataBR(new Date())}</div>
  </div>
  <div class="titulo">Pedido de compra — ${fornecedor?.razaoSocial ?? "—"}</div>
  <p style="font-size:10px;color:#444">
    ${fornecedor ? [fornecedor.nomeFantasia, fornecedor.cnpj, fornecedor.endereco, fornecedor.cidade].filter(Boolean).join(" · ") : ""}
  </p>
  <table>
    <thead><tr><th>Produto</th><th>Qtd</th><th>Valor unit.</th><th>Total</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <p class="total">Total: ${totalGeral}</p>
  ${fornecedor?.condicoesPagamento ? `<p style="font-size:10px"><strong>Condições:</strong> ${fornecedor.condicoesPagamento}</p>` : ""}
  ${compra.observacoes ? `<p style="font-size:10px"><strong>Observações:</strong> ${compra.observacoes}</p>` : ""}
  <div class="rodape">Sparapan Solução Naval — pedido gerado pelo sistema</div>
</body></html>`;

  const gotenbergUrl = process.env.GOTENBERG_URL ?? "http://gotenberg:3000";
  const form = new FormData();
  form.append("index.html", new Blob([html], { type: "text/html" }), "index.html");
  const res = await fetch(`${gotenbergUrl}/forms/chromium/convert/html`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Gotenberg: ${res.status}`);

  const bytes = Buffer.from(await res.arrayBuffer());
  const dir = path.join(uploadsDir(), "loja", "compras");
  await mkdir(dir, { recursive: true });
  const pdfCaminho = path.join("loja", "compras", `${compra.numero}.pdf`);
  await writeFile(path.join(uploadsDir(), pdfCaminho), bytes);
  return { pdfCaminho };
}
