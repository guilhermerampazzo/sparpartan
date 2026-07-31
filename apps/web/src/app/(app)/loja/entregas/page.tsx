import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Truck } from "lucide-react";
import { db } from "@/db";
import { lojaEntregas, lojaVendas, clientes, lojaVendaItens } from "@/db/schema";
import { Badge, EmptyState, DataTable, type Column } from "@/components/ui";

type LinhaEntrega = {
  id: string;
  vendaId: string;
  clienteNome: string;
  cidade: string | null;
  responsavel: string | null;
  dataPrevista: string | null;
  status: string;
};

const TONE_STATUS: Record<string, "info" | "warning" | "success"> = {
  pendente: "warning",
  em_transito: "info",
  entregue: "success",
};

const LABEL_STATUS: Record<string, string> = {
  pendente: "Pendente",
  em_transito: "Em Trânsito",
  entregue: "Entregue",
};

export default async function EntregasLojaPage() {
  const lista = await db
    .select({
      id: lojaEntregas.id,
      vendaId: lojaVendas.id,
      clienteNome: clientes.nome,
      cidade: lojaEntregas.cidade,
      responsavel: lojaEntregas.responsavel,
      dataPrevista: lojaEntregas.dataPrevista,
      status: lojaEntregas.status,
    })
    .from(lojaEntregas)
    .innerJoin(lojaVendas, eq(lojaEntregas.vendaId, lojaVendas.id))
    .innerJoin(clientes, eq(lojaVendas.clienteId, clientes.id))
    .orderBy(desc(lojaEntregas.criadoEm));

  const produtosPorVenda = new Map<string, string[]>();
  if (lista.length > 0) {
    const itens = await db.select().from(lojaVendaItens);
    for (const item of itens) {
      const atual = produtosPorVenda.get(item.vendaId) ?? [];
      atual.push(item.descricao);
      produtosPorVenda.set(item.vendaId, atual);
    }
  }

  const columns: Column<LinhaEntrega>[] = [
    {
      header: "Cliente",
      cell: (e) => (
        <Link href={`/loja/vendas/${e.vendaId}`} className="font-medium text-primary hover:underline">
          {e.clienteNome}
        </Link>
      ),
    },
    { header: "Produto(s)", cell: (e) => (produtosPorVenda.get(e.vendaId) ?? []).join(", ") || "—" },
    { header: "Cidade", cell: (e) => e.cidade ?? "—" },
    { header: "Responsável", cell: (e) => e.responsavel ?? "—" },
    { header: "Data Prevista", cell: (e) => e.dataPrevista ?? "—" },
    {
      header: "Status",
      cell: (e) => (
        <Badge tone={TONE_STATUS[e.status] ?? "info"} size="sm">
          {LABEL_STATUS[e.status] ?? e.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Entregas</h1>
      <p className="text-body-sm text-outline">Atualize o status de cada entrega na ficha da venda correspondente.</p>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(e) => e.id}
        empty={
          <EmptyState
            icon={Truck}
            title="Nenhuma entrega registrada ainda"
            description="Entregas são criadas na aba Resumo de cada venda."
          />
        }
      />
    </div>
  );
}
