import { desc } from "drizzle-orm";
import { Receipt, Repeat, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { despesas } from "@/db/schema";
import { Badge, Button, EmptyState, DataTable, BackButton, type Column } from "@/components/ui";
import { NovaDespesaForm } from "./form";
import { marcarDespesaComoPaga, replicarDespesasRecorrentes } from "./actions";

function formatMoney(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type LinhaDespesa = typeof despesas.$inferSelect;

export default async function DespesasPage() {
  const lista = await db.select().from(despesas).orderBy(desc(despesas.data));

  const columns: Column<LinhaDespesa>[] = [
    {
      header: "Descrição",
      cell: (d) => (
        <span className="flex items-center gap-2 font-medium text-primary">
          {d.descricao}
          {d.recorrente && <Repeat size={12} className="text-outline" />}
        </span>
      ),
    },
    {
      header: "Categoria",
      cell: (d) => (
        <Badge tone="neutral" size="sm">
          {d.categoria}
        </Badge>
      ),
    },
    { header: "Data", cell: (d) => d.data },
    { header: "Valor", cell: (d) => formatMoney(d.valor) },
    {
      header: "Situação",
      cell: (d) =>
        d.paga ? (
          <Badge tone="success" size="sm">
            Paga
          </Badge>
        ) : (
          <Badge tone="warning" size="sm">
            A Pagar
          </Badge>
        ),
    },
    {
      header: "",
      align: "right",
      cell: (d) =>
        d.paga ? (
          <span className="text-body-sm text-success">Paga</span>
        ) : (
          <form action={marcarDespesaComoPaga.bind(null, d.id)}>
            <Button type="submit" variant="outlined" size="sm" icon={CheckCircle2}>
              Marcar Paga
            </Button>
          </form>
        ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/vendas/financeiro" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Despesas e Custos Mensais</h1>
        <form action={replicarDespesasRecorrentes}>
          <Button type="submit" variant="outlined" icon={Repeat}>
            Lançar despesas fixas deste mês
          </Button>
        </form>
      </div>
      <p className="text-body-sm text-outline">
        Marque uma despesa como &quot;recorrente&quot; para poder relançá-la automaticamente
        todo mês com um clique, mantendo o mesmo dia de vencimento.
      </p>

      <NovaDespesaForm />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(d) => d.id}
        empty={<EmptyState icon={Receipt} title="Nenhuma despesa registrada ainda" />}
      />
    </div>
  );
}
