import { desc } from "drizzle-orm";
import { UsersRound, CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/db";
import { turmas } from "@/db/schema";
import { BackButton, EmptyState, DataTable, StatusBadge, Button, type Column } from "@/components/ui";
import { statusTurma } from "@/lib/status";
import { NovaTurmaForm } from "./form";
import { concluirTurma, cancelarTurma } from "./actions";

type LinhaTurma = typeof turmas.$inferSelect;

export default async function TurmasPage() {
  const lista = await db.select().from(turmas).orderBy(desc(turmas.criadoEm));

  const columns: Column<LinhaTurma>[] = [
    {
      header: "Turma",
      cell: (t) => <span className="font-medium text-primary">{t.nome}</span>,
    },
    {
      header: "Início",
      cell: (t) => (t.inicioEm ? new Date(`${t.inicioEm}T00:00:00`).toLocaleDateString("pt-BR") : "—"),
    },
    {
      header: "Status",
      cell: (t) => <StatusBadge status={statusTurma(t.status)} size="sm" />,
    },
    {
      header: "",
      align: "right",
      cell: (t) => (
        <div className="flex items-center justify-end gap-2">
          {t.status === "aberta" && (
            <form action={concluirTurma.bind(null, t.id)}>
              <Button type="submit" variant="outlined" size="sm" icon={CheckCircle2}>
                Concluir
              </Button>
            </form>
          )}
          {t.status === "aberta" && (
            <form action={cancelarTurma.bind(null, t.id)}>
              <Button type="submit" variant="text" size="sm" icon={XCircle}>
                Cancelar
              </Button>
            </form>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/escola" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Turmas</h1>
      <p className="text-body-sm text-outline">
        Turmas abertas aparecem na Central Operacional. Conclua a turma quando o curso terminar.
      </p>

      <NovaTurmaForm />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(t) => t.id}
        empty={<EmptyState icon={UsersRound} title="Nenhuma turma cadastrada ainda" />}
      />
    </div>
  );
}
