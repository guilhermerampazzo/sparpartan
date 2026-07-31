import { db } from "@/db";
import { clientes, templatesEmail } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { EnviarEmailForm } from "./form";

export default async function EnviarEmailPage() {
  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome, email: clientes.email })
    .from(clientes)
    .orderBy(clientes.nome);

  const listaTemplates = await db
    .select({ id: templatesEmail.id, nome: templatesEmail.nome })
    .from(templatesEmail)
    .orderBy(templatesEmail.nome);

  return (
    <div className="space-y-gutter">
      <BackButton href="/emails" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Enviar E-mail</h1>

      {listaTemplates.length === 0 ? (
        <p className="text-sm text-outline">
          Nenhum template disponível. Crie um em &quot;+ Novo Template&quot; primeiro.
        </p>
      ) : (
        <EnviarEmailForm listaClientes={listaClientes} listaTemplates={listaTemplates} />
      )}
    </div>
  );
}
