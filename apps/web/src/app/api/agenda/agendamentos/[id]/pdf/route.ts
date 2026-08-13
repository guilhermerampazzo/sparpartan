import { NextResponse } from "next/server";
import { usuarioEquipe } from "@/lib/sessao";
import { buscarAgendamentoCompleto } from "@/lib/agenda";
import { montarHtmlAgendamentos, gerarPdfDoHtml } from "@/lib/agenda-pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const agendamento = await buscarAgendamentoCompleto(id);
  if (!agendamento) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  const html = montarHtmlAgendamentos([agendamento], "AGENDAMENTO");
  const slug = agendamento.titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return gerarPdfDoHtml(html, `agendamento-${slug || agendamento.id.slice(0, 8)}`);
}
