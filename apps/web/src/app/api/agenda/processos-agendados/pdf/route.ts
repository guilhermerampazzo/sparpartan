import { NextResponse } from "next/server";
import { usuarioEquipe } from "@/lib/sessao";
import { buscarProcessosAgendados } from "@/lib/agenda-processos";
import { tipoEvento, statusEvento } from "@/lib/status";
import { EMPRESA } from "@/lib/empresa";

function escapaHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET() {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const eventos = await buscarProcessosAgendados();

  const linhas = eventos
    .map((ev) => {
      const dataHora = ev.dataHora.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
      const clientesServico = [
        ev.clienteNome,
        ...ev.interessados.map((i) => i.nomeInteressado),
      ]
        .filter(Boolean)
        .join(", ");
      const servicos = [ev.servicoNome, ...ev.interessados.map((i) => i.servicoSolicitado ?? null)]
        .filter(Boolean)
        .join(", ");
      return `<tr>
        <td>${escapaHtml(ev.representanteLegal || "—")}</td>
        <td>${escapaHtml(dataHora)}</td>
        <td>${escapaHtml(clientesServico || "—")}${servicos ? `<br><span class="dim">${escapaHtml(servicos)}</span>` : ""}</td>
        <td>${escapaHtml(ev.titulo)}<br><span class="dim">${escapaHtml(tipoEvento(ev.tipo).label)} · ${escapaHtml(statusEvento(ev.status).label)}</span></td>
      </tr>`;
    })
    .join("");

  const dataGeracao = new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

  const html = `<!doctype html>
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
    <div class="label">PROCESSOS AGENDADOS</div>
    <div class="numero">${eventos.length} agendamento(s)</div>
    <div>${dataGeracao}</div>
  </div>
</div>

${
  eventos.length === 0
    ? `<p>Nenhum processo agendado.</p>`
    : `<table>
      <thead><tr>
        <th>Representante Legal</th>
        <th>Data/Hora</th>
        <th>Clientes e Serviço</th>
        <th>Status</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
    </table>`
}

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
    return NextResponse.json(
      { error: "Serviço de conversão indisponível. Tente novamente em instantes." },
      { status: 503 }
    );
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Falha ao gerar o PDF" }, { status: 502 });
  }

  const pdfBuffer = Buffer.from(await res.arrayBuffer());
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Disposition": `attachment; filename="processos-agendados-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
