import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { servicos } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { EditarServicoForm } from "./form";

export default async function EditarServicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [servico] = await db.select().from(servicos).where(eq(servicos.id, id)).limit(1);
  if (!servico) notFound();

  return (
    <div className="space-y-gutter">
      <BackButton href={`/servicos/${id}`} />
      <h1 className="font-display text-headline-lg font-bold text-primary">
        Editar Serviço — {servico.nome}
      </h1>
      <EditarServicoForm servico={servico} />
    </div>
  );
}
