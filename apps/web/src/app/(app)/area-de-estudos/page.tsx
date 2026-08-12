import { eq } from "drizzle-orm";
import { GraduationCap, CheckCircle2, Circle } from "lucide-react";
import { db } from "@/db";
import { clientes, servicosContratados, materiaisEstudo, progressoEstudo, servicos } from "@/db/schema";
import { CampoSelect, SectionCard } from "@/components/ui/form-field";
import { Button, LinkButton, ProgressBar, EmptyState, BackButton } from "@/components/ui";
import { alternarProgresso } from "./actions";

export default async function AreaEstudosPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const { clienteId } = await searchParams;

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  let materiaisLiberados: (typeof materiaisEstudo.$inferSelect & { servicoNome: string })[] = [];
  let progresso: (typeof progressoEstudo.$inferSelect)[] = [];

  if (clienteId) {
    const servicosDoCliente = await db
      .select({ servicoId: servicosContratados.servicoId })
      .from(servicosContratados)
      .where(eq(servicosContratados.clienteId, clienteId));

    const servicoIds = servicosDoCliente.map((s) => s.servicoId);

    if (servicoIds.length > 0) {
      materiaisLiberados = await db
        .select({
          id: materiaisEstudo.id,
          servicoId: materiaisEstudo.servicoId,
          categoria: materiaisEstudo.categoria,
          titulo: materiaisEstudo.titulo,
          tipo: materiaisEstudo.tipo,
          url: materiaisEstudo.url,
          ordem: materiaisEstudo.ordem,
          criadoEm: materiaisEstudo.criadoEm,
          servicoNome: servicos.nome,
        })
        .from(materiaisEstudo)
        .innerJoin(servicos, eq(materiaisEstudo.servicoId, servicos.id))
        .where(eq(materiaisEstudo.servicoId, servicoIds[0]!));
    }

    progresso = await db
      .select()
      .from(progressoEstudo)
      .where(eq(progressoEstudo.clienteId, clienteId));
  }

  const concluidos = progresso.filter((p) => p.concluido).length;

  return (
    <div className="space-y-gutter">
      <BackButton href="/escola" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Escola Náutica</h1>
        <LinkButton href="/area-de-estudos/materiais/novo" variant="outlined" size="sm">
          + Novo Material
        </LinkButton>
      </div>

      <SectionCard title="Aluno">
        <form method="get" className="flex items-end gap-4">
          <div className="w-64">
            <CampoSelect
              label="Cliente"
              name="clienteId"
              defaultValue={clienteId ?? ""}
              options={[
                { value: "", label: "Selecione..." },
                ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
          </div>
          <Button type="submit" variant="outlined">
            Ver Progresso
          </Button>
        </form>
      </SectionCard>

      {clienteId && (
        <SectionCard title="Progresso do Aluno">
          {materiaisLiberados.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Nenhum material liberado"
              description="O cliente precisa ter um serviço contratado com materiais associados."
            />
          ) : (
            <>
              <ProgressBar value={concluidos} total={materiaisLiberados.length} label="Materiais concluídos" />
              <div className="mt-4">
                {materiaisLiberados.map((m) => {
                  const concluido = progresso.find((p) => p.materialId === m.id)?.concluido ?? false;
                  const alternarComId = alternarProgresso.bind(null, clienteId, m.id, concluido);
                  return (
                    <div
                      key={m.id}
                      className="flex items-center gap-3 border-b border-outline-variant py-2.5 last:border-0"
                    >
                      {concluido ? (
                        <CheckCircle2 size={20} className="shrink-0 text-success" />
                      ) : (
                        <Circle size={20} className="shrink-0 text-outline" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`text-body-md ${concluido ? "text-on-surface-variant line-through" : "text-primary"}`}>
                          {m.titulo}
                        </p>
                        <p className="text-body-sm text-outline">
                          {m.categoria ?? m.servicoNome} · {m.tipo}
                        </p>
                      </div>
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 text-body-sm text-primary hover:underline"
                      >
                        Abrir
                      </a>
                      <form action={alternarComId}>
                        <Button type="submit" variant={concluido ? "tonal" : "outlined"} size="sm">
                          {concluido ? "Concluído" : "Marcar concluído"}
                        </Button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </SectionCard>
      )}
    </div>
  );
}
