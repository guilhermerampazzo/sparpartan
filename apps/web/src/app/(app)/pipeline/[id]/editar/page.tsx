import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pipelineOportunidades, clientes } from "@/db/schema";
import { NovaOportunidadeForm } from "../../novo/form";
import { atualizarOportunidade } from "../../actions";

export default async function EditarOportunidadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [oportunidade] = await db
    .select()
    .from(pipelineOportunidades)
    .where(eq(pipelineOportunidades.id, id))
    .limit(1);
  if (!oportunidade) notFound();

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  const acao = atualizarOportunidade.bind(null, id);

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Editar Oportunidade</h1>
      <NovaOportunidadeForm
        listaClientes={listaClientes}
        oportunidadeInicial={oportunidade}
        action={acao}
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
