import { desc } from "drizzle-orm";
import { FileStack, Pencil } from "lucide-react";
import { db } from "@/db";
import { modelosDocumento } from "@/db/schema";
import { Badge, LinkButton, EmptyState, DataTable, type Column } from "@/components/ui";

type LinhaModelo = {
  id: string;
  nome: string;
  norma: string | null;
  campos: string[];
  duasVias: boolean;
  ativo: boolean;
};

export default async function ModelosPage() {
  const modelos = await db
    .select()
    .from(modelosDocumento)
    .orderBy(desc(modelosDocumento.criadoEm));

  const colunas: Column<LinhaModelo>[] = [
    { header: "Nome", cell: (m) => <span className="font-medium text-primary">{m.nome}</span> },
    { header: "Norma", cell: (m) => m.norma ?? "—" },
    { header: "Campos", cell: (m) => m.campos.length },
    {
      header: "2 Vias",
      cell: (m) => (m.duasVias ? <Badge tone="info" size="sm">Sim</Badge> : "Não"),
    },
    {
      header: "",
      cell: (m) => (
        <LinkButton href={`/configuracoes/modelos/${m.id}/editar`} variant="text" size="sm" icon={Pencil}>
          Editar
        </LinkButton>
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Modelos de Documento</h1>
        <LinkButton href="/configuracoes/modelos/novo">+ Importar Modelo</LinkButton>
      </div>

      <DataTable
        columns={colunas}
        rows={modelos}
        rowKey={(m) => m.id}
        empty={
          <EmptyState
            icon={FileStack}
            title="Nenhum modelo importado ainda"
            action={{ label: "+ Importar Modelo", href: "/configuracoes/modelos/novo" }}
          />
        }
      />
    </div>
  );
}
