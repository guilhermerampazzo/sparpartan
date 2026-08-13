import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { embarcacoesSparapan } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { EmbarcacaoSparapanForm } from "../../nova/form";
import { atualizarEmbarcacaoSparapan } from "../../../actions";

export default async function EditarEmbarcacaoSparapanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [embarcacao] = await db.select().from(embarcacoesSparapan).where(eq(embarcacoesSparapan.id, id)).limit(1);
  if (!embarcacao) notFound();

  return (
    <>
      <BackButton href={`/documentos-sparapan/embarcacoes/${id}`} />
      <h1 className="font-display text-headline-lg font-bold text-primary">Editar Embarcação</h1>
      <EmbarcacaoSparapanForm
        valoresIniciais={{
          nome: embarcacao.nome,
          numeroInscricao: embarcacao.numeroInscricao ?? "",
          tipo: embarcacao.tipo ?? "",
          atividade: embarcacao.atividade ?? "",
          anoFabricacao: embarcacao.anoFabricacao ?? "",
          motor: embarcacao.motor ?? "",
          numeroSerie: embarcacao.numeroSerie ?? "",
          observacoes: embarcacao.observacoes ?? "",
        }}
        aoSalvar={atualizarEmbarcacaoSparapan.bind(null, id)}
      />
    </>
  );
}
