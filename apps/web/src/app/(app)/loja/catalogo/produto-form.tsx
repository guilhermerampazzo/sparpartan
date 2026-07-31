"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoMoeda } from "@/components/ui";
import { LOJA_CATEGORIAS } from "@/lib/loja";
import { criarProdutoLoja, atualizarProdutoLoja } from "./actions";

type ProdutoExistente = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  fabricante: string | null;
  preco: string | null;
  estoque: number;
  observacoes: string | null;
};

export function ProdutoLojaForm({ produto }: { produto?: ProdutoExistente }) {
  const action = produto ? atualizarProdutoLoja.bind(null, produto.id) : criarProdutoLoja;
  const [estado, formAction] = useActionState(action, null);
  const v = (nome: string, padrao?: string) => estado?.valores?.[nome] ?? padrao ?? "";

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Dados do Produto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nome" name="nome" required defaultValue={v("nome", produto?.nome)} />
          <CampoSelect
            label="Categoria"
            name="categoria"
            required
            defaultValue={v("categoria", produto?.categoria)}
            options={[{ value: "", label: "Selecione..." }, ...LOJA_CATEGORIAS]}
          />
          <Campo label="Fabricante" name="fabricante" defaultValue={v("fabricante", produto?.fabricante ?? "")} />
          <CampoMoeda label="Preço" name="preco" defaultValue={v("preco", produto?.preco ?? "")} />
          <Campo
            label="Estoque"
            name="estoque"
            type="number"
            defaultValue={v("estoque", String(produto?.estoque ?? 0))}
          />
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Descrição</span>
          <textarea
            name="descricao"
            rows={3}
            defaultValue={v("descricao", produto?.descricao ?? "")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Observações</span>
          <textarea
            name="observacoes"
            rows={2}
            defaultValue={v("observacoes", produto?.observacoes ?? "")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </div>
      </SectionCard>

      <SubmitButton>{produto ? "Salvar Alterações" : "Cadastrar Produto"}</SubmitButton>
    </form>
  );
}
