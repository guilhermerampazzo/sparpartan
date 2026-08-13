"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui";

export type ItemCatalogo = {
  id: string;
  nome: string;
  categoria: string;
  marca: string;
  descricao: string;
  fichaTecnica: string;
  preco: string | null;
  disponibilidade: string;
  estoque: number;
  fotoId: string | null;
  caracteristicas: string;
};

export type ItemCarrinho = { produtoId: string; nome: string; preco: string; quantidade: number };

const CHAVE = "sparapan-loja-carrinho";

export function lerCarrinho(): ItemCarrinho[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "[]") as ItemCarrinho[];
  } catch {
    return [];
  }
}

export function salvarCarrinho(itens: ItemCarrinho[]) {
  localStorage.setItem(CHAVE, JSON.stringify(itens));
  window.dispatchEvent(new Event("sparapan-carrinho"));
}

function formatarMoeda(v: string | null) {
  if (!v) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Grade comercial com "Adicionar ao carrinho" (agrupa por produto). */
export function CatalogoCliente({ itens }: { itens: ItemCatalogo[] }) {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [adicionado, setAdicionado] = useState<string | null>(null);

  useEffect(() => {
    setCarrinho(lerCarrinho());
    const handler = () => setCarrinho(lerCarrinho());
    window.addEventListener("sparapan-carrinho", handler);
    return () => window.removeEventListener("sparapan-carrinho", handler);
  }, []);

  function adicionar(item: ItemCatalogo) {
    if (!item.preco) return;
    const atual = lerCarrinho();
    const existente = atual.find((i) => i.produtoId === item.id);
    const proximo = existente
      ? atual.map((i) => (i.produtoId === item.id ? { ...i, quantidade: i.quantidade + 1 } : i))
      : [...atual, { produtoId: item.id, nome: item.nome, preco: item.preco, quantidade: 1 }];
    salvarCarrinho(proximo);
    setAdicionado(item.id);
    setTimeout(() => setAdicionado(null), 1200);
  }

  const totalItens = carrinho.reduce((acc, i) => acc + i.quantidade, 0);

  return (
    <>
      <p className="flex items-center gap-2 text-body-sm text-outline">
        <ShoppingCart size={14} /> {totalItens} item(ns) no carrinho
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {itens.map((item) => (
          <div key={item.id} className="flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-card">
            <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-surface-container-low">
              {item.fotoId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/loja-produto-fotos/${item.fotoId}`} alt={item.nome} className="h-full w-full rounded-lg object-cover" />
              ) : (
                <span className="font-display text-title-md font-bold text-outline">{item.categoria}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-display text-title-sm font-semibold text-primary">{item.nome}</p>
              {item.marca && <p className="text-body-sm text-outline">{item.marca}</p>}
              {item.caracteristicas && <p className="text-body-sm text-outline">{item.caracteristicas}</p>}
              <p className="mt-1 line-clamp-2 text-body-sm text-outline">{item.descricao}</p>
              {item.fichaTecnica && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-body-sm font-medium text-primary hover:underline">Ficha técnica</summary>
                  <p className="mt-1 text-body-sm text-outline">{item.fichaTecnica}</p>
                </details>
              )}
              <p className="mt-2 font-display text-title-md font-bold text-primary">{formatarMoeda(item.preco)}</p>
              <Badge tone={item.disponibilidade === "estoque" ? "success" : "info"} size="sm">
                {item.disponibilidade === "estoque" ? "Em estoque" : "Sob encomenda"}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => adicionar(item)}
              disabled={!item.preco}
              className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-body-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {adicionado === item.id ? <Check size={14} /> : <Plus size={14} />}
              {adicionado === item.id ? "Adicionado!" : "Adicionar ao carrinho"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
