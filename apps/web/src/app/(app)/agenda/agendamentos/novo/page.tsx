import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clientes, processos, servicos, representantesLegais } from "@/db/schema";
import { BackButton, Button } from "@/components/ui";
import { CampoSelect, SectionCard } from "@/components/ui/form-field";
import { FormAgendamento } from "../form";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const { clienteId: raw } = await searchParams;
  const clienteId = raw && UUID_RE.test(raw) ? raw : undefined;

  const [listaClientes, listaServicos, listaRepresentantes, listaProcessos] = await Promise.all([
    db
      .select({ id: clientes.id, nome: clientes.nome })
      .from(clientes)
      .where(isNull(clientes.excluidoEm))
      .orderBy(clientes.nome),
    db
      .select({ id: servicos.id, nome: servicos.nome })
      .from(servicos)
      .where(eq(servicos.ativo, true))
      .orderBy(servicos.nome),
    db
      .select({ id: representantesLegais.id, nome: representantesLegais.nome })
      .from(representantesLegais)
      .orderBy(representantesLegais.nome),
    clienteId
      ? db
          .select({ id: processos.id, servicoNome: servicos.nome })
          .from(processos)
          .innerJoin(servicos, eq(processos.servicoId, servicos.id))
          .where(and(eq(processos.clienteId, clienteId), isNull(processos.excluidoEm)))
          .orderBy(processos.criadoEm)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-gutter">
      <BackButton href="/agenda/agendamentos" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Agendamento</h1>

      <SectionCard title="Cliente (para carregar os processos dele)">
        <form method="get" className="flex items-end gap-4">
          <div className="w-72">
            <CampoSelect
              label="Cliente"
              name="clienteId"
              defaultValue={clienteId ?? ""}
              options={[{ value: "", label: "Selecione..." }, ...listaClientes.map((c) => ({ value: c.id, label: c.nome }))]}
            />
          </div>
          <Button type="submit" variant="outlined">
            Carregar Processos
          </Button>
        </form>
      </SectionCard>

      <FormAgendamento
        listaClientes={listaClientes}
        listaServicos={listaServicos}
        listaRepresentantes={listaRepresentantes}
        listaProcessos={listaProcessos}
        valoresIniciais={{ clienteId }}
      />
    </div>
  );
}
