import { desc, eq, isNull } from "drizzle-orm";
import { Receipt, Trash2 } from "lucide-react";
import { db } from "@/db";
import { orcamentos, clientes, servicos } from "@/db/schema";
import {
  StatusBadge,
  LinkButton,
  ConfirmButton,
  EmptyState,
  DataTable,
  type Column,
} from "@/components/ui";
import { statusOrcamento } from "@/lib/status";
import { excluirOrcamento } from "./actions";

function formatMoney(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type LinhaOrcamento = {
  id: string;
  numero: string;
  valor: string;
  status: string;
  clienteNome: string;
  servicoNome: string | null;
  descricao: string | null;
};

export default async function OrcamentosPage() {
  const lista = await db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      valor: orcamentos.valor,
      status: orcamentos.status,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
      descricao: orcamentos.descricao,
    })
    .from(orcamentos)
    .innerJoin(clientes, eq(orcamentos.clienteId, clientes.id))
    .leftJoin(servicos, eq(orcamentos.servicoId, servicos.id))
    .where(isNull(orcamentos.excluidoEm))
    .orderBy(desc(orcamentos.criadoEm));

  const columns: Column<LinhaOrcamento>[] = [
    { header: "Número", cell: (o) => <span className="font-medium text-primary">{o.numero}</span> },
    { header: "Cliente", cell: (o) => o.clienteNome },
    { header: "Serviço", cell: (o) => o.servicoNome ?? o.descricao ?? "—" },
    { header: "Valor", cell: (o) => formatMoney(o.valor) },
    { header: "Status", cell: (o) => <StatusBadge status={statusOrcamento(o.status)} /> },
    {
      header: "",
      align: "right",
      cell: (o) => {
        const excluirComId = excluirOrcamento.bind(null, o.id);
        return (
          <div className="flex items-center justify-end gap-2">
            {o.status === "pendente" && (
              <LinkButton href={`/orcamentos/${o.id}/editar`} variant="text" size="sm">
                Editar
              </LinkButton>
            )}
            <form action={excluirComId}>
              <ConfirmButton
                mensagem={`Excluir orçamento ${o.numero}?`}
                variant="text"
                icon={<Trash2 size={12} />}
              >
                Excluir
              </ConfirmButton>
            </form>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Orçamentos</h1>
        <LinkButton href="/orcamentos/novo">+ Novo Orçamento</LinkButton>
      </div>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(o) => o.id}
        rowHref={(o) => `/orcamentos/${o.id}`}
        empty={
          <EmptyState
            icon={Receipt}
            title="Nenhum orçamento criado ainda"
            action={{ label: "+ Novo Orçamento", href: "/orcamentos/novo" }}
          />
        }
      />
    </div>
  );
}
