import { redirect } from "next/navigation";

/** Módulo unificado na Central de Pendências — mantém a rota antiga funcionando. */
export default function PendentesRedirectPage() {
  redirect("/pendencias");
}
