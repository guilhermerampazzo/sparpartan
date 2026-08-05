import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { orcamentos, orcamentoItens, clientes, servicos, embarcacoes, contasBancarias } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { NovoOrcamentoForm } from "../../novo/form";
import { atualizarOrcamento } from "../../actions";

export default async function EditarOrcamentoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [orcamento] = await db.select().from(orcamentos).where(eq(orcamentos.id, id)).limit(1);
  if (!orcamento) notFound();
  if (orcamento.status !== "pendente") notFound();

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);
  const listaServicos = await db
    .select({ id: servicos.id, nome: servicos.nome, valor: servicos.valor })
    .from(servicos)
    .orderBy(servicos.nome);
  const listaEmbarcacoes = await db
    .select({ id: embarcacoes.id, nome: embarcacoes.nome, clienteId: embarcacoes.clienteId })
    .from(embarcacoes)
    .orderBy(embarcacoes.nome);
  const listaContasBancarias = await db
    .select({ id: contasBancarias.id, apelido: contasBancarias.apelido })
    .from(contasBancarias)
    .orderBy(contasBancarias.apelido);
  const itens = await db
    .select({ descricao: orcamentoItens.descricao, quantidade: orcamentoItens.quantidade, valorUnitario: orcamentoItens.valorUnitario })
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, id))
    .orderBy(asc(orcamentoItens.ordem));

  return (
    <div className="space-y-gutter">
      <BackButton href={`/orcamentos/${id}`} />
      <h1 className="font-display text-headline-lg font-bold text-primary">
        Editar Orçamento {orcamento.numero}
      </h1>
      <NovoOrcamentoForm
        listaClientes={listaClientes}
        listaServicos={listaServicos}
        listaEmbarcacoes={listaEmbarcacoes}
        listaContasBancarias={listaContasBancarias}
        orcamentoInicial={orcamento}
        itensIniciais={itens}
        action={atualizarOrcamento.bind(null, id)}
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
