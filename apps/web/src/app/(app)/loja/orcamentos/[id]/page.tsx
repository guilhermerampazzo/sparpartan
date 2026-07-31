import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lojaOrcamentos, lojaOrcamentoItens, clientes, lojaVendas } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { Badge, Button, BackButton } from "@/components/ui";
import { infoStatusOrcamento, formatarMoeda } from "@/lib/loja";
import { aprovarOrcamentoLoja, recusarOrcamentoLoja } from "../actions";

export default async function OrcamentoLojaDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [orcamento] = await db.select().from(lojaOrcamentos).where(eq(lojaOrcamentos.id, id)).limit(1);
  if (!orcamento) notFound();

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, orcamento.clienteId)).limit(1);
  const itens = await db.select().from(lojaOrcamentoItens).where(eq(lojaOrcamentoItens.orcamentoId, id));
  const [vendaGerada] = await db.select().from(lojaVendas).where(eq(lojaVendas.orcamentoId, id)).limit(1);

  const info = infoStatusOrcamento(orcamento.status);
  const aprovarComId = aprovarOrcamentoLoja.bind(null, id);
  const recusarComId = recusarOrcamentoLoja.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja/orcamentos" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-headline-lg font-bold text-primary">{orcamento.numero}</h1>
            <Badge tone={info.tone} size="sm">{info.label}</Badge>
          </div>
          <p className="text-body-sm text-outline">
            Cliente:{" "}
            <Link href={`/clientes/${cliente.id}`} className="hover:underline">
              {cliente.nome}
            </Link>
          </p>
        </div>
        {orcamento.status === "pendente" && (
          <div className="flex gap-2">
            <form action={recusarComId}>
              <Button type="submit" variant="outlined">
                Recusar
              </Button>
            </form>
            <form action={aprovarComId}>
              <Button type="submit" variant="filled">
                Aprovar e Gerar Venda
              </Button>
            </form>
          </div>
        )}
        {vendaGerada && (
          <Link href={`/loja/vendas/${vendaGerada.id}`} className="text-body-sm font-medium text-primary hover:underline">
            Ver venda gerada →
          </Link>
        )}
      </div>

      <SectionCard title="Itens">
        <table className="w-full text-left text-body-md">
          <thead>
            <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
              <th className="px-2 py-2">Descrição</th>
              <th className="px-2 py-2">Qtd</th>
              <th className="px-2 py-2">Preço Unit.</th>
              <th className="px-2 py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-outline-variant last:border-0">
                <td className="px-2 py-2">{item.descricao}</td>
                <td className="px-2 py-2">{item.quantidade}</td>
                <td className="px-2 py-2">{formatarMoeda(item.precoUnitario)}</td>
                <td className="px-2 py-2">{formatarMoeda(Number(item.precoUnitario) * item.quantidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-right font-display text-title-md font-semibold text-primary">
          Total: {formatarMoeda(orcamento.valorTotal)}
        </p>
      </SectionCard>

      {orcamento.observacoes && (
        <SectionCard title="Observações">
          <p className="whitespace-pre-wrap text-body-md text-primary">{orcamento.observacoes}</p>
        </SectionCard>
      )}
    </div>
  );
}
