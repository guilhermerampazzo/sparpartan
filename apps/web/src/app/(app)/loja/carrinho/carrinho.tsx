"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button, EmptyState } from "@/components/ui";
import { lerCarrinho, salvarCarrinho, type ItemCarrinho } from "../catalogo-cliente/catalogo-cliente";
import { finalizarOrcamentoCarrinho } from "../orcamentos/actions";

type ClienteOpcao = { id: string; nome: string; cpfCnpj: string | null };

function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function Carrinho({ listaClientes }: { listaClientes: ClienteOpcao[] }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [cadastroRapido, setCadastroRapido] = useState(false);
  const [desconto, setDesconto] = useState(0);
  const [frete, setFrete] = useState(0);
  const [validade, setValidade] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    setItens(lerCarrinho());
    const handler = () => setItens(lerCarrinho());
    window.addEventListener("sparapan-carrinho", handler);
    return () => window.removeEventListener("sparapan-carrinho", handler);
  }, []);

  function alterarQuantidade(produtoId: string, delta: number) {
    const proximo = lerCarrinho()
      .map((i) => (i.produtoId === produtoId ? { ...i, quantidade: Math.max(1, i.quantidade + delta) } : i))
      .filter((i) => i.quantidade > 0);
    salvarCarrinho(proximo);
  }

  function excluir(produtoId: string) {
    salvarCarrinho(lerCarrinho().filter((i) => i.produtoId !== produtoId));
  }

  const subtotal = itens.reduce((acc, i) => acc + i.quantidade * Number(i.preco), 0);
  const total = Math.max(0, subtotal - desconto) + frete;

  return (
    <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {itens.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Carrinho vazio"
            description="Adicione produtos pelo catálogo da Loja."
          />
        ) : (
          itens.map((item) => (
            <div key={item.produtoId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
              <div className="min-w-0">
                <p className="text-body-md font-medium text-primary">{item.nome}</p>
                <p className="text-body-sm text-outline">{formatarMoeda(Number(item.preco))} por unidade</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-outline-variant px-2 py-1">
                  <button type="button" onClick={() => alterarQuantidade(item.produtoId, -1)} aria-label="Diminuir">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-body-md font-semibold text-primary">{item.quantidade}</span>
                  <button type="button" onClick={() => alterarQuantidade(item.produtoId, 1)} aria-label="Aumentar">
                    <Plus size={14} />
                  </button>
                </div>
                <span className="w-28 text-right font-display text-title-sm font-bold text-primary">
                  {formatarMoeda(item.quantidade * Number(item.preco))}
                </span>
                <button type="button" onClick={() => excluir(item.produtoId)} aria-label="Excluir item" className="text-outline hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {itens.length > 0 && (
        <form action={finalizarOrcamentoCarrinho} className="h-fit space-y-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <input type="hidden" name="itens" value={JSON.stringify(itens)} />
          <h2 className="font-display text-title-md font-semibold text-primary">Finalizar orçamento</h2>

          <div className="flex flex-col gap-1">
            <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Cliente</span>
            {!cadastroRapido ? (
              <select
                name="clienteId"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              >
                <option value="">— selecione —</option>
                {listaClientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <input name="nome" placeholder="Nome completo *" required className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
                <input name="cpfCnpj" placeholder="CPF/CNPJ" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
                <input name="email" placeholder="E-mail" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
                <input name="telefone" placeholder="Telefone" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
                <input name="celular" placeholder="Celular/WhatsApp" className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setCadastroRapido(!cadastroRapido)}
              className="text-left text-body-sm font-medium text-primary hover:underline"
            >
              {cadastroRapido ? "← Selecionar cliente existente" : "+ Cadastrar novo cliente"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Desconto (R$)</span>
              <input name="desconto" type="number" step="0.01" value={desconto || ""} onChange={(e) => setDesconto(Number(e.target.value) || 0)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Frete (R$)</span>
              <input name="frete" type="number" step="0.01" value={frete || ""} onChange={(e) => setFrete(Number(e.target.value) || 0)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Validade</span>
              <input name="validade" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Forma de pagamento</span>
              <select name="formaPagamento" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary">
                <option value="">—</option>
                <option value="pix">Pix</option>
                <option value="cartao_credito">Cartão de crédito</option>
                <option value="boleto">Boleto</option>
                <option value="transferencia">Transferência</option>
                <option value="dinheiro">Dinheiro</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Observações</span>
            <textarea name="observacoes" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary" />
          </label>

          <div className="space-y-1 border-t border-outline-variant pt-3 text-body-sm">
            <p className="flex justify-between text-outline"><span>Subtotal</span><span>{formatarMoeda(subtotal)}</span></p>
            {desconto > 0 && <p className="flex justify-between text-outline"><span>Desconto</span><span>−{formatarMoeda(desconto)}</span></p>}
            {frete > 0 && <p className="flex justify-between text-outline"><span>Frete</span><span>{formatarMoeda(frete)}</span></p>}
            <p className="flex justify-between font-display text-title-md font-bold text-primary"><span>Total</span><span>{formatarMoeda(total)}</span></p>
          </div>

          <Button type="submit" className="w-full">Finalizar orçamento</Button>
          <Link href="/loja/catalogo-cliente" className="flex items-center justify-center gap-1 text-body-sm font-medium text-primary hover:underline">
            <ArrowLeft size={12} /> Voltar ao catálogo
          </Link>
        </form>
      )}
    </div>
  );
}
