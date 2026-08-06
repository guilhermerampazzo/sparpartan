import { redirect } from "next/navigation";

/**
 * O módulo "Lembretes" foi substituído pela Central de Pendências, que concentra
 * todas as tarefas automáticas (vencimentos, provas, compromissos) e manuais.
 * Mantemos a rota para não quebrar links antigos (home, pendentes), apontando
 * para a central.
 */
export default function LembretesPage() {
  redirect("/pendencias");
}
