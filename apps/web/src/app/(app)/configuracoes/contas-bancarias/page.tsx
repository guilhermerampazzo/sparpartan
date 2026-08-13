import { Landmark, Trash2, Pencil } from "lucide-react";
import { db } from "@/db";
import { contasBancarias } from "@/db/schema";
import { BackButton, EmptyState, DataTable, LinkButton, type Column } from "@/components/ui";
import { NovaContaBancariaForm } from "./form";
import { excluirContaBancaria } from "./actions";
import { ConfirmButton } from "@/components/ui";

type LinhaConta = typeof contasBancarias.$inferSelect;

export default async function ContasBancariasPage({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string }>;
}) {
  const { origem } = await searchParams;
  const lista = await db.select().from(contasBancarias).orderBy(contasBancarias.apelido);

  const columns: Column<LinhaConta>[] = [
    { header: "Apelido", cell: (c) => <span className="font-medium text-primary">{c.apelido}</span> },
    { header: "Banco", cell: (c) => c.banco ?? "—" },
    { header: "Agência", cell: (c) => c.agencia ?? "—" },
    { header: "Conta", cell: (c) => c.conta ?? "—" },
    { header: "PIX", cell: (c) => c.pix ?? "—" },
    {
      header: "",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-2">
          <LinkButton
            href={`/configuracoes/contas-bancarias/${c.id}/editar${origem ? `?origem=${encodeURIComponent(origem)}` : ""}`}
            variant="text"
            size="sm"
            icon={Pencil}
          >
            Editar
          </LinkButton>
          <form action={excluirContaBancaria.bind(null, c.id)}>
            <ConfirmButton mensagem={`Excluir a conta "${c.apelido}"?`} icon={<Trash2 size={14} />}>
              Excluir
            </ConfirmButton>
          </form>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href={origem || "/configuracoes"} />
      <h1 className="font-display text-headline-lg font-bold text-primary">Contas Bancárias</h1>
      <p className="max-w-2xl text-body-sm text-outline">
        Cadastre as contas usadas para receber pagamentos. Elas ficam disponíveis para escolha nos
        orçamentos e aparecem no PDF na seção &quot;Dados para Pagamento&quot;.
      </p>

      <NovaContaBancariaForm />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(c) => c.id}
        empty={<EmptyState icon={Landmark} title="Nenhuma conta bancária cadastrada ainda" />}
      />
    </div>
  );
}
