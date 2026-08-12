import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, processos, servicos } from "@/db/schema";
import { CampoSelect, SectionCard } from "@/components/ui/form-field";
import { Button, BackButton } from "@/components/ui";
import { NovoEventoForm } from "./form";

export default async function NovoEventoPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const { clienteId } = await searchParams;

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  const listaProcessos = clienteId
    ? await db
        .select({ id: processos.id, servicoNome: servicos.nome })
        .from(processos)
        .innerJoin(servicos, eq(processos.servicoId, servicos.id))
        .where(eq(processos.clienteId, clienteId))
    : [];

  return (
    <div className="space-y-gutter">
      <BackButton href="/agenda" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Evento</h1>

      <SectionCard title="1. Cliente (para vincular a um processo)">
        <form method="get" className="flex items-end gap-4">
          <div className="w-64">
            <CampoSelect
              label="Cliente"
              name="clienteId"
              defaultValue={clienteId ?? ""}
              options={[
                { value: "", label: "Nenhum" },
                ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
          </div>
          <Button type="submit" variant="outlined">
            Carregar Processos
          </Button>
        </form>
      </SectionCard>

      <NovoEventoForm clienteId={clienteId ?? ""} listaProcessos={listaProcessos} />
    </div>
  );
}
