import { NextResponse } from "next/server";
import { usuarioEquipe } from "@/lib/sessao";
import { listarAgendamentos, type AgendamentoCompleto } from "@/lib/agenda";
import { montarHtmlAgendamentos, gerarPdfDoHtml } from "@/lib/agenda-pdf";

export async function GET() {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const linhas = await listarAgendamentos();
  // Normaliza o shape da listagem para o formato completo usado pelo template do PDF.
  const agendamentos: AgendamentoCompleto[] = linhas.map((l) => ({
    id: l.id,
    titulo: l.titulo,
    dataHora: l.dataHora,
    tipo: l.tipo,
    status: l.status,
    local: l.local,
    observacoes: null,
    cliente: l.clienteId ? { id: l.clienteId, nome: l.clienteNome ?? "Cliente removido" } : null,
    servico: { id: "", nome: l.servicoNome ?? "—" },
    representanteLegal: l.representanteNome ? { id: "", nome: l.representanteNome, cpf: null } : null,
    interessados: l.interessados.map((it) => ({
      id: "",
      nome: it.nome,
      cpf: null,
      servicoSolicitado: it.servico,
      observacao: null,
    })),
    processos: l.processos.map((p) => ({ id: p.processoId, numeroProtocolo: null, servicoNome: p.servicoNome })),
  }));

  const html = montarHtmlAgendamentos(agendamentos, "AGENDAMENTOS");
  const data = new Date().toISOString().slice(0, 10);
  return gerarPdfDoHtml(html, `agendamentos-${data}`);
}
