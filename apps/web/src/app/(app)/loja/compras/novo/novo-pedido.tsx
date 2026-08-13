"use client";

import { useMemo, useState } from "react";
import { Plus, Minus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { criarComprasInteligentes } from "../actions";

type Produto = { id: string; nome: string; estoque: number; estoqueMinimo: number };
type Vinculo = {
  produtoId: string;
  fornecedorId: string;
  preco: string;
  prazoEntrega: string | null;
  condicaoPagamento: string | null;
  preferencial: boolean;
  fornecedorNome: string;
};

type Linha = { produtoId: string; quantidade: number };

function formatarMoeda(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function NovoPedidoCompra({ produtos, vinculos }: { produtos: Produto[]; vinculos: Vinculo[] }) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});

  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? id;
  const opcoesDe = (produtoId: string) => vinculos.filter((v) => v.produtoId === produtoId);

  const resumo = useMemo(() => {
    const porFornecedor = new Map<string, { nome: string; itens: { nome: string; qtd: number; preco: string }[]; total: number }>();
    for (const linha of linhas) {
      const opcoes = opcoesDe(linha.produtoId);
      if (opcoes.length === 0) continue;
      const escolhido = opcoes.find((o) => o.fornecedorId === escolhas[linha.produtoId]) ?? opcoes[0];
      const grupo = porFornecedor.get(escolhido.fornecedorId) ?? { nome: escolhido.fornecedorNome, itens: [], total: 0 };
      grupo.itens.push({ nome: nomeProduto(linha.produtoId), qtd: linha.quantidade, preco: escolhido.preco });
      grupo.total += linha.quantidade * Number(escolhido.preco);
      porFornecedor.set(escolhido.fornecedorId, grupo);
    }
    return [...porFornecedor.values()];
  }, [linhas, escolhas, vinculos]);

  function alterar(produtoId: string, delta: number) {
    setLinhas((atual) => {
      const existente = atual.find((l) => l.produtoId === produtoId);
      if (!existente) return [...atual, { produtoId, quantidade: 1 }];
      return atual
        .map((l) => (l.produtoId === produtoId ? { ...l, quantidade: Math.max(1, l.quantidade + delta) } : l))
        .filter((l) => l.quantidade > 0);
    });
  }

  return (
    <form action={criarComprasInteligentes} className="space-y-gutter">
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
        <h2 className="mb-3 font-display text-title-md font-semibold text-primary">Produtos e quantidades</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {produtos.map((p) => {
            const linha = linhas.find((l) => l.produtoId === p.id);
            const temFornecedor = opcoesDe(p.id).length > 0;
            const estoqueBaixo = p.estoqueMinimo > 0 && p.estoque <= p.estoqueMinimo;
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-primary">{p.nome}</p>
                  <p className="text-body-xs text-outline">
                    Estoque: {p.estoque}
                    {estoqueBaixo && <span className="ml-1 text-warning">⚠️ baixo</span>}
                  </p>
                </div>
                {temFornecedor ? (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => alterar(p.id, -1)} aria-label="Diminuir"><Minus size={14} /></button>
                    <span className="w-8 text-center text-body-md font-semibold">{linha?.quantidade ?? 0}</span>
                    <button type="button" onClick={() => alterar(p.id, 1)} aria-label="Aumentar"><Plus size={14} /></button>
                  </div>
                ) : (
                  <span className="text-body-xs text-outline">sem fornecedor</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {linhas.length > 0 && (
        <div className="space-y-4">
          {linhas.map((linha) => {
            const opcoes = opcoesDe(linha.produtoId);
            if (opcoes.length === 0) return null;
            return (
              <div key={linha.produtoId} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
                <p className="mb-2 font-display text-title-sm font-semibold text-primary">
                  {nomeProduto(linha.produtoId)} — {linha.quantidade} un
                </p>
                {opcoes.length === 1 ? (
                  <p className="text-body-sm text-outline">
                    Fornecedor: <strong>{opcoes[0].fornecedorNome}</strong> — {formatarMoeda(opcoes[0].preco)}
                    {opcoes[0].prazoEntrega ? ` · prazo ${opcoes[0].prazoEntrega} dias` : ""}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-body-sm text-outline">Escolha o fornecedor (menor preço destacado):</p>
                    {opcoes.map((o) => (
                      <label key={o.fornecedorId} className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2">
                        <input
                          type="radio"
                          name={`fornecedor_${linha.produtoId}`}
                          value={o.fornecedorId}
                          checked={escolhas[linha.produtoId] === o.fornecedorId}
                          onChange={() => setEscolhas((e) => ({ ...e, [linha.produtoId]: o.fornecedorId }))}
                          className="accent-primary"
                        />
                        <span className="flex-1 text-body-sm">
                          {o.fornecedorNome}
                          {o.preferencial && <span className="ml-1 rounded bg-success-container px-1 text-[10px] text-on-success-container">preferencial</span>}
                          {o.preco === opcoes.reduce((m, x) => (Number(x.preco) < Number(m) ? x.preco : m), opcoes[0].preco) && (
                            <span className="ml-1 rounded bg-primary-container px-1 text-[10px] text-on-primary-container">menor preço</span>
                          )}
                        </span>
                        <span className="text-body-sm font-medium text-primary">{formatarMoeda(o.preco)}</span>
                        <span className="text-body-sm text-outline">{o.prazoEntrega ? `${o.prazoEntrega} dias` : "—"}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
            <h3 className="mb-2 flex items-center gap-2 font-display text-title-md font-semibold text-primary">
              <Sparkles size={16} /> Pedidos que serão criados (separados por fornecedor)
            </h3>
            {resumo.length === 0 ? (
              <p className="text-body-sm text-outline">Nenhum produto com fornecedor — vincule fornecedores antes.</p>
            ) : (
              <div className="space-y-3">
                {resumo.map((g, i) => (
                  <div key={i} className="rounded-lg border border-outline-variant p-3">
                    <p className="font-display text-title-sm font-semibold text-primary">PEDIDO — {g.nome}</p>
                    <ul className="mt-1 text-body-sm">
                      {g.itens.map((item, j) => (
                        <li key={j} className="flex justify-between text-outline">
                          <span>{item.qtd} × {item.nome}</span>
                          <span>{formatarMoeda(item.preco)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-right font-display text-title-sm font-bold text-primary">Total: {formatarMoeda(String(g.total))}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <input type="hidden" name="itens" value={JSON.stringify(linhas.filter((l) => opcoesDe(l.produtoId).length > 0))} />
          <Button type="submit" disabled={resumo.length === 0}>
            Confirmar e criar pedidos
          </Button>
        </div>
      )}
    </form>
  );
}
