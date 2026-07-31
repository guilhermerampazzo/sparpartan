"use client";

import { useActionState, useState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoMoeda } from "@/components/ui";
import { criarOrcamentoLoja } from "../actions";
import { NovoClienteInlineLoja } from "./novo-cliente-inline";

const MAX_ITENS = 8;

export function NovoOrcamentoLojaForm({
  listaClientes,
  listaProdutos,
  produtoInicial,
}: {
  listaClientes: { id: string; nome: string }[];
  listaProdutos: { id: string; nome: string; preco: string | null }[];
  produtoInicial?: { id: string; nome: string; preco: string | null };
}) {
  const [estado, formAction] = useActionState(criarOrcamentoLoja, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  const [clientes, setClientes] = useState(listaClientes);
  const [quantidadeItens, setQuantidadeItens] = useState(produtoInicial ? 1 : 1);

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Cliente">
        <div className="space-y-2">
          <CampoSelect
            label="Cliente"
            name="clienteId"
            required
            defaultValue={v("clienteId")}
            options={[{ value: "", label: "Selecione..." }, ...clientes.map((c) => ({ value: c.id, label: c.nome }))]}
          />
          <NovoClienteInlineLoja
            onCriado={(cliente) => {
              setClientes((atual) => [...atual, cliente].sort((a, b) => a.nome.localeCompare(b.nome)));
            }}
          />
        </div>
      </SectionCard>

      <SectionCard title="Itens do Orçamento">
        <div className="space-y-4">
          {Array.from({ length: quantidadeItens }).map((_, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-3 sm:grid-cols-[2fr_1fr_1fr]">
              <CampoSelect
                label="Produto do catálogo (opcional)"
                name={`item${i}ProdutoId`}
                defaultValue={i === 0 && produtoInicial ? produtoInicial.id : ""}
                options={[{ value: "", label: "— avulso —" }, ...listaProdutos.map((p) => ({ value: p.id, label: p.nome }))]}
              />
              <Campo label="Quantidade" name={`item${i}Quantidade`} type="number" defaultValue={1} />
              <CampoMoeda
                label="Preço unitário"
                name={`item${i}Preco`}
                defaultValue={i === 0 && produtoInicial ? (produtoInicial.preco ?? "") : ""}
              />
              <div className="sm:col-span-3">
                <Campo
                  label="Descrição"
                  name={`item${i}Descricao`}
                  defaultValue={i === 0 && produtoInicial ? produtoInicial.nome : ""}
                  required={i === 0}
                />
              </div>
            </div>
          ))}
        </div>
        {quantidadeItens < MAX_ITENS && (
          <button
            type="button"
            onClick={() => setQuantidadeItens((n) => Math.min(MAX_ITENS, n + 1))}
            className="mt-3 text-body-sm font-medium text-primary hover:underline"
          >
            + Adicionar item
          </button>
        )}
      </SectionCard>

      <SectionCard title="Observações">
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={v("observacoes")}
          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        />
      </SectionCard>

      <SubmitButton>Criar Orçamento</SubmitButton>
    </form>
  );
}
