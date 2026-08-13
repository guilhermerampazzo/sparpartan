import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { buscarEventoCompleto } from "@/lib/agenda-eventos";
import { FormEvento } from "../../form";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditarEventoInternoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const evento = await buscarEventoCompleto(id);
  if (!evento) notFound();

  const listaUsuarios = await db
    .select({ id: usuarios.id, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(usuarios.nome);

  return (
    <div className="space-y-gutter">
      <BackButton href={`/agenda/eventos/${id}`} />
      <h1 className="font-display text-headline-lg font-bold text-primary">Editar Evento</h1>
      <FormEvento
        listaUsuarios={listaUsuarios}
        valoresIniciais={{
          titulo: evento.titulo,
          descricao: evento.descricao ?? undefined,
          data: evento.data,
          prazoSolucao: evento.prazoSolucao ?? undefined,
          responsavelId: evento.responsavelId ?? undefined,
          status: evento.status,
          observacoes: evento.observacoes ?? undefined,
          vinculos: evento.vinculos.map((v) => ({ entidade: v.entidade, entidadeId: v.entidadeId, rotulo: v.rotulo })),
        }}
      />
    </div>
  );
}
