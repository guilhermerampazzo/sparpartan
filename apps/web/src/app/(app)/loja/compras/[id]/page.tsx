import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { lojaCompras, lojaCompraItens, lojaFornecedores, lojaProdutos } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { Badge, Button, ConfirmButton, LinkButton, BackButton } from "@/components/ui";
import { infoStatusCompra, formatarMoeda } from "@/lib/loja";
import { formatarDataBR } from "@/lib/datas";
import { avancarStatusCompra, registrarRecebimentoCompra, excluirCompra } from "../actions";

const PROXIMOS: Record<string, string[]> = {
  rascunho: ["aguardando_envio"],
  aguardando_envio: ["pedido_enviado"],
  pedido_enviado: ["aguardando_fornecedor"],
  aguardando_fornecedor: ["confirmado"],
  confirmado: ["em_transporte"],
  em_transporte: ["recebido"],
};

export default async function CompraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [compra] = await db.select().from(lojaCompras).where(eq(lojaCompras.id, id)).limit(1);
  if (!compra) notFound();

  const [fornecedor] = await db.select().from(lojaFornecedores).where(eq(lojaFornecedores.id, compra.fornecedorId)).limit(1);
  const itens = await db
    .select({
      id: lojaCompraItens.id,
      quantidade: lojaCompraItens.quantidade,
      quantidadeRecebida: lojaCompraItens.quantidadeRecebida,
      precoUnitario: lojaCompraItens.precoUnitario,
      produtoNome: lojaProdutos.nome,
    })
    .from(lojaCompraItens)
    .innerJoin(lojaProdutos, eq(lojaCompraItens.produtoId, lojaProdutos.id))
    .where(eq(lojaCompraItens.compraId, id))
    .orderBy(desc(lojaCompraItens.id));

  const info = infoStatusCompra(compra.status);
  const totalPendente = itens.reduce((acc, i) => acc + (i.quantidade - i.quantidadeRecebida), 0);
  const totalCompra = itens.reduce((acc, i) => acc + i.quantidade * Number(i.precoUnitario), 0);
  const avancos = PROXIMOS[compra.status] ?? [];

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja/compras" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-headline-lg font-bold text-primary">{compra.numero}</h1>
            <Badge tone={info.tone} size="sm">{info.label}</Badge>
          </div>
          <p className="text-body-sm text-outline">
            Fornecedor: <strong>{fornecedor?.razaoSocial}</strong> · criado em {formatarDataBR(compra.criadoEm)}
          </p>
          {compra.observacoes && <p className="text-body-sm text-outline">{compra.observacoes}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/api/loja/compras/${id}/pdf`} variant="outlined" size="sm">
            PDF do Pedido
          </LinkButton>
          {avancos.map((proximo) => (
            <form key={proximo} action={avancarStatusCompra.bind(null, id)}>
              <input type="hidden" name="proximo" value={proximo} />
              <Button type="submit" variant="outlined" size="sm">
                {proximo === "aguardando_envio" ? "Aguardando envio" : proximo === "pedido_enviado" ? "Pedido enviado" : proximo === "aguardando_fornecedor" ? "Aguardando fornecedor" : proximo === "confirmado" ? "Confirmado" : proximo === "em_transporte" ? "Em transporte" : proximo === "recebido" ? "Marcar recebido" : proximo}
              </Button>
            </form>
          ))}
          <form action={excluirCompra.bind(null, id)}>
            <ConfirmButton mensagem="Excluir este pedido?" variant="text" size="sm">
              <Trash2 size={14} />
            </ConfirmButton>
          </form>
        </div>
      </div>

      <SectionCard title={`Itens (${itens.length})`}>
        <table className="w-full text-left text-body-md">
          <thead>
            <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
              <th className="px-2 py-2">Produto</th>
              <th className="px-2 py-2">Qtd</th>
              <th className="px-2 py-2">Recebido</th>
              <th className="px-2 py-2">Pendente</th>
              <th className="px-2 py-2">Valor unit.</th>
              <th className="px-2 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-outline-variant last:border-0">
                <td className="px-2 py-2">{item.produtoNome}</td>
                <td className="px-2 py-2">{item.quantidade}</td>
                <td className="px-2 py-2">
                  {item.quantidadeRecebida >= item.quantidade ? (
                    <span className="text-success">✅ {item.quantidadeRecebida}</span>
                  ) : item.quantidadeRecebida > 0 ? (
                    <span className="text-warning">⚠️ {item.quantidadeRecebida}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-2 py-2">{Math.max(0, item.quantidade - item.quantidadeRecebida)}</td>
                <td className="px-2 py-2">{formatarMoeda(item.precoUnitario)}</td>
                <td className="px-2 py-2">{formatarMoeda(Number(item.precoUnitario) * item.quantidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-right font-display text-title-md font-bold text-primary">
          Total do pedido: {formatarMoeda(totalCompra)}
        </p>
      </SectionCard>

      {totalPendente > 0 && (
        <SectionCard title="Recebimento">
          <p className="mb-3 text-body-sm text-outline">
            Marque as quantidades recebidas — o estoque é atualizado automaticamente. Faltam {totalPendente} item(ns).
          </p>
          <form action={registrarRecebimentoCompra.bind(null, id)} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {itens
              .filter((i) => i.quantidadeRecebida < i.quantidade)
              .map((item) => (
                <label key={item.id} className="flex flex-col gap-1 rounded-lg border border-outline-variant p-3">
                  <span className="text-body-sm font-medium text-primary">{item.produtoNome}</span>
                  <span className="text-body-xs text-outline">
                    Recebido {item.quantidadeRecebida} de {item.quantidade}
                  </span>
                  <input
                    name={`recebida_${item.id}`}
                    type="number"
                    min={0}
                    max={item.quantidade - item.quantidadeRecebida}
                    placeholder="Quantidade recebida"
                    className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                  />
                </label>
              ))}
            <div>
              <Button type="submit" className="mt-6">Registrar recebimento</Button>
            </div>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
