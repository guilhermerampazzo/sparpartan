import { redirect } from "next/navigation";

/** Antigo cadastro único virou o fluxo de Novo Agendamento — mantém a URL para não quebrar links antigos. */
export default function NovoEventoPage() {
  redirect("/agenda/agendamentos/novo");
}
