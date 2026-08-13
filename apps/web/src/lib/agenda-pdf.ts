import type { AgendamentoCompleto } from "./agenda";
import { EMPRESA } from "./empresa";

export function escapaHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function linhaHtml(ev: AgendamentoCompleto): string {
  const dataHora = ev.dataHora.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
  const clientesServico = [ev.cliente?.nome, ...ev.interessados.map((i) => i.nome)].filter(Boolean).join(", ");
  const servicos = [ev.servico?.nome, ...ev.interessados.map((i) => i.servicoSolicitado ?? null)].filter(Boolean).join(", ");
  const processos = ev.processos.map((p) => p.servicoNome ?? "Processo").join(", ");
  return `<tr>
    <td>${escapaHtml(ev.representanteLegal?.nome ?? "—")}</td>
    <td>${escapaHtml(dataHora)}</td>
    <td>${escapaHtml(clientesServico || "—")}${servicos ? `<br><span class="dim">${escapaHtml(servicos)}</span>` : ""}</td>
    <td>${processos ? escapaHtml(processos) : "—"}</td>
    <td>${escapaHtml(ev.titulo)}<br><span class="dim">${escapaHtml(ev.tipo)} · ${escapaHtml(ev.status)}</span></td>
  </tr>`;
}

export function montarHtmlAgendamentos(
  agendamentos: AgendamentoCompleto[],
  rotuloDocumento: string
): string {
  const dataGeracao = new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
  const linhas = agendamentos.map(linhaHtml).join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 40px; color: #001736; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  .brand h1 { margin: 0; font-size: 26px; color: #002b5b; letter-spacing: 1px; }
  .brand p { margin: 2px 0; }
  .numero-box { border: 1px solid #002b5b; border-radius: 6px; padding: 12px 20px; text-align: center; }
  .numero-box .label { font-size: 11px; font-weight: bold; color: #002b5b; text-transform: uppercase; }
  .numero-box .numero { font-size: 18px; font-weight: bold; color: #002b5b; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #002b5b; color: #fff; text-align: left; padding: 8px; font-size: 11px; }
  td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .dim { color: #64748b; font-size: 11px; }
  .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; }
</style></head><body>

<div class="header">
  <div class="brand">
    <h1>${EMPRESA.nome}</h1>
    <p>${EMPRESA.razaoSocial}</p>
    <p>CNPJ: ${EMPRESA.cnpj}</p>
  </div>
  <div class="numero-box">
    <div class="label">${rotuloDocumento}</div>
    <div class="numero">${agendamentos.length} agendamento(s)</div>
    <div>${dataGeracao}</div>
  </div>
</div>

${
  agendamentos.length === 0
    ? `<p>Nenhum agendamento.</p>`
    : `<table>
      <thead><tr>
        <th>Representante Legal</th>
        <th>Data/Hora</th>
        <th>Clientes e Serviço</th>
        <th>Processos</th>
        <th>Status</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
    </table>`
}

<div class="footer">${EMPRESA.nome} ${EMPRESA.razaoSocial} | CNPJ: ${EMPRESA.cnpj}</div>

</body></html>`;
}

/** Converte um HTML em PDF via Gotenberg (chromium) — padrão do sistema. */
export async function gerarPdfDoHtml(html: string, nomeArquivo: string): Promise<Response> {
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
    return Response.json(
      { error: "Serviço de conversão indisponível. Tente novamente em instantes." },
      { status: 503 }
    );
  }

  if (!res.ok) {
    return Response.json({ error: "Falha ao gerar o PDF" }, { status: 502 });
  }

  const pdfBuffer = Buffer.from(await res.arrayBuffer());
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Disposition": `attachment; filename="${nomeArquivo}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
