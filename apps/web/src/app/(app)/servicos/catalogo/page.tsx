import { desc } from "drizzle-orm";
import { Package } from "lucide-react";
import { db } from "@/db";
import { catalogoItens } from "@/db/schema";
import { LinkButton, Badge, EmptyState, DataTable, type Column, BackButton } from "@/components/ui";
import { NovoItemCatalogoForm } from "./form";

function formatMoney(v: string | null) {
  if (!v) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type LinhaCatalogo = typeof catalogoItens.$inferSelect;

export default async function CatalogoPage() {
  const lista = await db.select().from(catalogoItens).orderBy(desc(catalogoItens.criadoEm));

  const columns: Column<LinhaCatalogo>[] = [
    {
      header: "Tipo",
      cell: (item) => (
        <Badge tone="info" size="sm">
          {item.tipo}
        </Badge>
      ),
    },
    { header: "Descrição", cell: (item) => <span className="font-medium text-primary">{item.descricao}</span> },
    {
      header: "Marca/Modelo",
      cell: (item) => [item.marca, item.modelo].filter(Boolean).join(" / ") || "—",
    },
    { header: "Preço", cell: (item) => formatMoney(item.preco) },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Catálogo</h1>
        <BackButton href="/servicos" />
      </div>

      <NovoItemCatalogoForm />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(item) => item.id}
        empty={<EmptyState icon={Package} title="Nenhum item no catálogo ainda" />}
      />
    </div>
  );
}
