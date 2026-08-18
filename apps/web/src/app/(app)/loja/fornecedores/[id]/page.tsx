import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2, Pencil, Plus } from "lucide-react";
import { db } from "@/db";
import { lojaFornecedores, lojaProdutoFornecedores, lojaProdutos } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { Badge, Button, ConfirmButton, LinkButton, BackButton } from "@/components/ui";
import { infoStatusCompra, formatarMoeda } from "@/lib/loja";
import { dataIsoParaBR } from "@/lib/datas";
import { adicionarProdutoFornecedor, removerProdutoFornecedor, excluirFornecedor, buscarHistoricoComprasFornecedor } from "../actions";

export default async function FornecedorDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [fornecedor] = await db.select().from(lojaFornecedores).where(eq(lojaFornecedores.id, id)).limit(1);
  if (!fornecedor) notFound();

  const vinculos = await db
    .select({
      id: lojaProdutoFornecedores.id,
      produtoId: lojaProdutoFornecedores.produtoId,
      preco: lojaProdutoFornecedores.preco,
      prazoEntrega: lojaProdutoFornecedores.prazoEntrega,
      condicaoPagamento: lojaProdutoFornecedores.condicaoPagamento,
      preferencial: lojaProdutoFornecedores.preferencial,
      produtoNome: lojaProdutos.nome,
      produtoSku: lojaProdutos.sku,
    })
    .from(lojaProdutoFornecedores)
    .innerJoin(lojaProdutos, eq(lojaProdutoFornecedores.produtoId, lojaProdutos.id))
    .where(eq(lojaProdutoFornecedores.fornecedorId, id))
    .orderBy(asc(lojaProdutos.nome));

  const produtosSemVinculo = await db
    .select()
    .from(lojaProdutos)
    .where(eq(lojaProdutos.ativo, true))
    .orderBy(asc(lojaProdutos.nome));

  const historico = await buscarHistoricoComprasFornecedor(id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja/fornecedores" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">{fornecedor.razaoSocial}</h1>
          <p className="text-body-sm text-outline">
            {[fornecedor.nomeFantasia, fornecedor.cnpj, fornecedor.cidade].filter(Boolean).join(" · ")}
          </p>
          {fornecedor.contatoResponsavel && (
            <p className="text-body-sm text-outline">Contato: {fornecedor.contatoResponsavel} · {fornecedor.telefone ?? fornecedor.whatsapp ?? fornecedor.email ?? ""}</p>
          )}
          {fornecedor.condicoesPagamento && (
            <p className="text-body-sm text-outline">Condições: {fornecedor.condicoesPagamento} · Prazo médio: {fornecedor.prazoMedioEntrega ?? "—"}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <LinkButton href={`/loja/fornecedores/${id}/editar`} variant="outlined" size="sm" icon={Pencil}>
            Editar
          </LinkButton>
          <form action={excluirFornecedor.bind(null, id)}>
            <ConfirmButton mensagem={`Excluir o fornecedor "${fornecedor.razaoSocial}"?`} variant="text" size="sm">
              <Trash2 size={14} />
            </ConfirmButton>
          </form>
        </div>
      </div>

      <SectionCard title={`Produtos fornecidos (${vinculos.length})`}>
        <form action={adicionarProdutoFornecedor.bind(null, id)} className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-3 sm:grid-cols-2 lg:grid-cols-5">
          <select name="produtoId" required className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary sm:col-span-2">
            <option value="">— selecione o produto —</option>
            {produtosSemVinculo.map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <input name="preco" type="number" step="0.01" placeholder="Preço (R$)" required className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <input name="prazoEntrega" placeholder="Prazo (dias)" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-body-sm text-primary">
              <input name="preferencial" type="checkbox" className="accent-primary" /> Preferencial
            </label>
            <Button type="submit" size="sm" icon={Plus}>Vincular</Button>
          </div>
          <input name="condicaoPagamento" placeholder="Condição (ex.: 28 dias)" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary sm:col-span-2" />
        </form>

        {vinculos.length === 0 ? (
          <p className="text-body-sm text-outline">Nenhum produto vinculado ainda — cadastre acima para as compras inteligentes funcionarem.</p>
        ) : (
          <table className="w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                <th className="px-2 py-2">Produto</th>
                <th className="px-2 py-2">Código</th>
                <th className="px-2 py-2">Preço</th>
                <th className="px-2 py-2">Prazo</th>
                <th className="px-2 py-2">Condição</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {vinculos.map((v) => (
                <tr key={v.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-2 py-2">{v.produtoNome}{v.preferencial && <Badge tone="success" size="sm">preferencial</Badge>}</td>
                  <td className="px-2 py-2">{v.produtoSku ?? "—"}</td>
                  <td className="px-2 py-2">{formatarMoeda(v.preco)}</td>
                  <td className="px-2 py-2">{v.prazoEntrega ?? "—"}</td>
                  <td className="px-2 py-2">{v.condicaoPagamento ?? "—"}</td>
                  <td className="px-2 py-2">
                    <form action={removerProdutoFornecedor.bind(null, id, v.id)}>
                      <ConfirmButton mensagem="Remover vínculo?" variant="text" size="sm">
                        <Trash2 size={12} />
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Histórico de compras">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone="success" size="sm">{historico.totais.pedidosRealizados} pedidos realizados</Badge>
          <Badge tone="warning" size="sm">{historico.totais.pedidosPendentes} pendentes</Badge>
          <Badge tone="info" size="sm">Total comprado: {formatarMoeda(historico.totais.valorTotalCompras)}</Badge>
        </div>

        <h3 className="mb-2 font-display text-title-sm font-semibold text-primary">Pedidos</h3>
        {historico.pedidos.length === 0 ? (
          <p className="text-body-sm text-outline">Nenhuma compra registrada ainda.</p>
        ) : (
          <table className="w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                <th className="px-2 py-2">Pedido</th>
                <th className="px-2 py-2">Data</th>
                <th className="px-2 py-2">Itens</th>
                <th className="px-2 py-2">Total</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {historico.pedidos.map((pedido) => {
                const status = infoStatusCompra(pedido.status);
                return (
                  <tr key={pedido.id} className="border-b border-outline-variant last:border-0">
                    <td className="px-2 py-2"><Link href={`/loja/compras/${pedido.id}`} className="font-medium text-primary hover:underline">{pedido.numero}</Link></td>
                    <td className="px-2 py-2">{dataIsoParaBR(pedido.criadoEm)}</td>
                    <td className="px-2 py-2">{pedido.totalItens}</td>
                    <td className="px-2 py-2">{formatarMoeda(pedido.totalValor)}</td>
                    <td className="px-2 py-2"><Badge tone={status.tone} size="sm">{status.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {historico.resumoPorProduto.length > 0 && (
          <>
            <h3 className="mb-2 mt-5 font-display text-title-sm font-semibold text-primary">Resumo por produto</h3>
            <table className="w-full text-left text-body-md">
              <thead>
                <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                  <th className="px-2 py-2">Produto</th>
                  <th className="px-2 py-2">Quantidade total</th>
                  <th className="px-2 py-2">Último preço</th>
                  <th className="px-2 py-2">Última compra</th>
                  <th className="px-2 py-2">Pendente</th>
                </tr>
              </thead>
              <tbody>
                {historico.resumoPorProduto.map((produto) => (
                  <tr key={produto.produtoId} className="border-b border-outline-variant last:border-0">
                    <td className="px-2 py-2">{produto.descricao}</td>
                    <td className="px-2 py-2">{produto.quantidadeTotal}</td>
                    <td className="px-2 py-2">{formatarMoeda(produto.ultimoPreco)}</td>
                    <td className="px-2 py-2">{dataIsoParaBR(produto.ultimaData)}</td>
                    <td className="px-2 py-2">
                      {produto.quantidadePendente > 0 ? <Badge tone="warning" size="sm">⚠️ {produto.quantidadePendente}</Badge> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </SectionCard>
    </div>
  );
}
