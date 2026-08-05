import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { opcoesDeModulos } from "@/lib/permissoes";
import { BackButton } from "@/components/ui";
import { NovoUsuarioForm } from "./form";

export default async function NovoUsuarioPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") redirect("/");

  const opcoes = opcoesDeModulos();

  return (
    <div className="space-y-gutter">
      <BackButton href="/configuracoes/usuarios" />
      <div>
        <h1 className="font-display text-headline-lg font-bold text-primary">Novo Usuário</h1>
        <p className="text-body-sm text-outline">
          Cadastre um colaborador e defina já em quais áreas ele poderá acessar.
        </p>
      </div>
      <NovoUsuarioForm opcoes={opcoes} />
    </div>
  );
}
