import { and, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { clientes, processos, servicos, representantesLegais } from "@/db/schema";
import { BackButton, Button } from "@/components/ui";
import { CampoSelect, SectionCard } from "@/components/ui/form-field";
import { buscarAgendamentoCompleto } from "@/lib/agenda";
import { FormAgendamento } from "../../form";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditarAgendamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const agendamento = await buscarAgendamentoCompleto(id);
  if (!agendamento) notFound();

  const { clienteId: raw } = await searchParams;
  // O cliente escolhido: o da URL (troca rápida) ou o do próprio agendamento.
  const clienteId = (raw && UUID_RE.test(raw) ? raw : agendamento.cliente?.id) ?? undefined;

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

  const dataHoraLocal = new Date(agendamento.dataHora);
  const dataHoraStr = `${dataHoraLocal.getFullYear()}-${String(dataHoraLocal.getMonth() + 1).padStart(2, "0")}-${String(
    dataHoraLocal.getDate()
  ).padStart(2, "0")}T${String(dataHoraLocal.getHours()).padStart(2, "0")}:${String(dataHoraLocal.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="space-y-gutter">
      <BackButton href={`/agenda/agendamentos/${id}`} />
      <h1 className="font-display text-headline-lg font-bold text-primary">Editar Agendamento</h1>

      <SectionCard title="Trocar cliente (recarrega os processos)">
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
        valoresIniciais={{
          titulo: agendamento.titulo,
          dataHora: dataHoraStr,
          tipo: agendamento.tipo,
          clienteId,
          servicoId: agendamento.servico?.id,
          representanteLegalId: agendamento.representanteLegal?.id,
          local: agendamento.local ?? undefined,
          observacoes: agendamento.observacoes ?? undefined,
          processoIds: agendamento.processos.map((p) => p.id),
          interessados: agendamento.interessados.map((it) => ({
            nome: it.nome,
            cpf: it.cpf,
            servicoSolicitado: it.servicoSolicitado,
            observacao: it.observacao,
          })),
        }}
      />
    </div>
  );
}
