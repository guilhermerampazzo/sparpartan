import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { usuarioEquipe } from "@/lib/sessao";
import { db } from "@/db";
import { clientes } from "@/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { clienteId } = await params;
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1);
  if (!cliente) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const endereco = [
    cliente.rua && cliente.numero ? `${cliente.rua}, ${cliente.numero}` : cliente.rua,
    cliente.complemento,
    cliente.bairro,
  ]
    .filter(Boolean)
    .join(" — ");

  const cidadeUf = [cliente.cidade, cliente.uf].filter(Boolean).join("/");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
@page { size: 100mm 150mm; margin: 0; }
body {
  font-family: sans-serif;
  width: 100mm;
  height: 150mm;
  margin: 0;
  padding: 10mm;
  box-sizing: border-box;
  position: relative;
  color: #001736;
}
.watermark {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 48px;
  color: rgba(0, 43, 91, 0.08);
  font-weight: bold;
  white-space: nowrap;
}
h2 { margin: 0 0 4mm; font-size: 14px; color: #666; text-transform: uppercase; }
.linha { font-size: 16px; margin-bottom: 2mm; }
</style></head><body>
<div class="watermark">SPARAPAN SOLUÇÃO NAVAL</div>
<h2>Destinatário</h2>
<p class="linha"><strong>${cliente.nome}</strong></p>
<p class="linha">${endereco || "—"}</p>
<p class="linha">${cliente.cep ?? ""} — ${cidadeUf}</p>
</body></html>`;

  const gotenbergUrl = process.env.GOTENBERG_URL ?? "http://gotenberg:3000";
  const body = new FormData();
  body.append("files", new Blob([html], { type: "text/html" }), "index.html");
  const res = await fetch(`${gotenbergUrl}/forms/chromium/convert/html`, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Falha ao gerar etiqueta" }, { status: 502 });
  }

  const pdfBuffer = Buffer.from(await res.arrayBuffer());
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Disposition": `attachment; filename="etiqueta-${cliente.nome}.pdf"`,
      "Content-Type": "application/pdf",
    },
  });
}
