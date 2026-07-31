import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { modelosDocumento, servicos } from "@/db/schema";
import { EditarModeloForm } from "./form";
import { CamposMarcacaoForm } from "./campos-marcacao-form";

export default async function EditarModeloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [modelo] = await db.select().from(modelosDocumento).where(eq(modelosDocumento.id, id)).limit(1);
  if (!modelo) notFound();

  const listaServicos = await db
    .select({ id: servicos.id, nome: servicos.nome })
    .from(servicos)
    .where(eq(servicos.ativo, true))
    .orderBy(servicos.nome);

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Editar Modelo</h1>
      <p className="max-w-2xl text-sm text-outline">
        Altere o nome ou substitua o arquivo .docx (por exemplo, quando a NORMAM atualiza o
        formulário). Os campos de mesclagem são reextraídos automaticamente ao trocar o arquivo.
      </p>
      <EditarModeloForm modelo={{ id: modelo.id, nome: modelo.nome }} />

      <CamposMarcacaoForm
        modeloId={modelo.id}
        campos={modelo.campos}
        camposMarcacao={modelo.camposMarcacao}
        servicos={listaServicos}
      />
    </div>
  );
}
