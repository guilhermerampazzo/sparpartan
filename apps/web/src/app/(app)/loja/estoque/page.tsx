import { asc, sql } from "drizzle-orm";
import { Boxes, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { lojaProdutos } from "@/db/schema";
import { Badge, EmptyState, BackButton, LinkButton } from "@/components/ui";
import { rotuloCategoria } from "@/lib/loja";

export default async function EstoquePage() {
  const produtos = await db
    .select()
    .from(lojaProdutos)
    .where(sql`${lojaProdutos.ativo} = true`)
    .orderBy(asc(lojaProdutos.nome));

  const baixos = produtos.filter((p) => p.estoqueMinimo > 0 && p.estoque <= p.estoqueMinimo);

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">Estoque</h1>
          <p className="text-body-sm text-outline">
            Quantidade disponível, reservada, mínima — a baixa é automática na venda e a entrada no recebimento de compra.
          </p>
        </div>
        <LinkButton href="/loja/compras/novo">+ Novo Pedido de Compra</LinkButton>
      </div>

      {baixos.length > 0 && (
        <div className="rounded-xl border border-warning bg-warning-container p-4 text-on-warning-container">
          <p className="flex items-center gap-2 font-display text-title-sm font-semibold">
            <AlertTriangle size={16} /> Estoque baixo em {baixos.length} produto(s) — adicione à próxima compra.
          </p>
        </div>
      )}

      {produtos.length === 0 ? (
        <EmptyState icon={Boxes} title="Nenhum produto cadastrado" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <table className="w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Disponível</th>
                <th className="px-4 py-3">Reservado</th>
                <th className="px-4 py-3">Mínimo</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const baixo = p.estoqueMinimo > 0 && p.estoque <= p.estoqueMinimo;
                return (
                  <tr key={p.id} className="border-b border-outline-variant last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/loja/catalogo/${p.id}`} className="font-medium text-primary hover:underline">
                        {p.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-outline">{rotuloCategoria(p.categoria)}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{p.estoque}</td>
                    <td className="px-4 py-3 text-outline">{p.estoqueReservado}</td>
                    <td className="px-4 py-3 text-outline">{p.estoqueMinimo}</td>
                    <td className="px-4 py-3">
                      {baixo ? (
                        <Badge tone="danger" size="sm">⚠️ Repor</Badge>
                      ) : p.estoque === 0 ? (
                        <Badge tone="warning" size="sm">Sem estoque</Badge>
                      ) : (
                        <Badge tone="success" size="sm">OK</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
