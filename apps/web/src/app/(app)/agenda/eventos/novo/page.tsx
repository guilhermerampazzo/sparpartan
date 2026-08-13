import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { FormEvento } from "../form";

export default async function NovoEventoInternoPage() {
  const listaUsuarios = await db
    .select({ id: usuarios.id, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(usuarios.nome);

  return (
    <div className="space-y-gutter">
      <BackButton href="/agenda/eventos" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Evento</h1>
      <p className="text-body-sm text-outline">
        Eventos são ocorrências internas — podem ou não estar ligados a um atendimento. Ex.: “Verificar documento pendente do cliente X até dia 20.”
      </p>
      <FormEvento listaUsuarios={listaUsuarios} />
    </div>
  );
}
