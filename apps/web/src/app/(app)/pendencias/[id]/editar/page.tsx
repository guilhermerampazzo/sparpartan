import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pendencias, clientes } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { NovaPendenciaForm } from "../../form";
import { atualizarPendencia } from "../../actions";

export default async function EditarPendenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [pendencia] = await db
    .select()
    .from(pendencias)
    .where(eq(pendencias.id, id))
    .limit(1);
  if (!pendencia) notFound();

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  return (
    <div className="space-y-gutter">
      <BackButton href="/pendencias" />
      <h1 className="font-display text-headline-lg font-bold text-primary">
        Editar Pendência
      </h1>
      <NovaPendenciaForm
        listaClientes={listaClientes}
        listaResponsaveis={[]}
        pendenciaInicial={pendencia}
        action={atualizarPendencia.bind(null, id)}
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
