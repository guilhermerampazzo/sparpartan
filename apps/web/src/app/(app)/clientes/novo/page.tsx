import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { servicos } from "@/db/schema";
import { BackButton } from "@/components/ui";

import { NovoClienteForm } from "./form";

export default async function NovoClientePage() {
  const listaServicos = await db
    .select({ id: servicos.id, nome: servicos.nome })
    .from(servicos)
    .where(eq(servicos.ativo, true))
    .orderBy(asc(servicos.nome));

  return (
    <>
      <BackButton href="/clientes" />
      <NovoClienteForm listaServicos={listaServicos} />
    </>
  );
}
