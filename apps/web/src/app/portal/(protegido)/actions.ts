"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { lembretes, processos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { registrarAuditoria } from "@/lib/audit";

export async function pedirRenovacao(processoId: string) {
  const session = await auth();
  const clienteId = session?.user?.id;
  if (!clienteId) throw new Error("Não autenticado");

  const [processo] = await db.select().from(processos).where(eq(processos.id, processoId)).limit(1);
  if (!processo || processo.clienteId !== clienteId) throw new Error("Processo não encontrado");

  const [lembrete] = await db
    .insert(lembretes)
    .values({
      clienteId,
      mensagem: `Cliente pediu renovação pelo portal do processo ${processoId}.`,
      dataLembrete: new Date().toISOString().slice(0, 10),
      origem: "cliente_solicitacao",
      referenciaTipo: "processo",
      referenciaId: processoId,
    })
    .returning({ id: lembretes.id });

  await registrarAuditoria("criar", "lembrete_renovacao", lembrete.id, `processo ${processoId}`);
  revalidatePath("/portal");
}
