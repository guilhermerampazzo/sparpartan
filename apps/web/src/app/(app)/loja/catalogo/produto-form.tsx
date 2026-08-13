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
  marca?: string | null;
  modelo?: string | null;
  sku?: string | null;
  fichaTecnica?: string | null;
  unidade?: string | null;
  disponibilidade?: string | null;
  custo?: string | null;
  descontoMaximo?: string | null;
  precoPromocional?: string | null;
  estoqueMinimo?: number | null;
  numeroSerie?: string | null;
  anoFabricacao?: string | null;
  potencia?: string | null;
  caracteristicasTecnicas?: string | null;
  ativo?: boolean | null;
};

export function ProdutoLojaForm({ produto }: { produto?: ProdutoExistente }) {
  const action = produto ? atualizarProdutoLoja.bind(null, produto.id) : criarProdutoLoja;
  const [estado, formAction] = useActionState(action, null);
  const v = (nome: string, padrao?: string) => estado?.valores?.[nome] ?? padrao ?? "";
  const categoria = v("categoria", produto?.categoria ?? "");
  const eEmbarcacaoOuMotor = categoria === "embarcacao" || categoria === "motor";

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Informações básicas">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nome" name="nome" required defaultValue={v("nome", produto?.nome)} />
          <CampoSelect
            label="Categoria"
            name="categoria"
            required
            defaultValue={v("categoria", produto?.categoria)}
            options={[{ value: "", label: "Selecione..." }, ...LOJA_CATEGORIAS]}
          />
          <Campo label="Marca" name="marca" defaultValue={v("marca", produto?.marca ?? "")} />
          <Campo label="Modelo" name="modelo" defaultValue={v("modelo", produto?.modelo ?? "")} />
          <Campo label="Código/SKU" name="sku" defaultValue={v("sku", produto?.sku ?? "")} />
          <CampoSelect
            label="Disponibilidade"
            name="disponibilidade"
            defaultValue={v("disponibilidade", produto?.disponibilidade ?? "estoque")}
            options={[
              { value: "estoque", label: "Em estoque" },
              { value: "encomenda", label: "Sob encomenda" },
            ]}
          />
          <Campo label="Unidade" name="unidade" defaultValue={v("unidade", produto?.unidade ?? "un")} />
          <Campo
            label="Quantidade em estoque"
            name="estoque"
            type="number"
            defaultValue={v("estoque", String(produto?.estoque ?? 0))}
          />
          <Campo
            label="Estoque mínimo (alerta de reposição)"
            name="estoqueMinimo"
            type="number"
            defaultValue={v("estoqueMinimo", String(produto?.estoqueMinimo ?? 0))}
          />
          <label className="flex items-end gap-2 pb-2">
            <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Ativo</span>
            <input name="ativo" type="checkbox" defaultChecked={produto?.ativo ?? true} className="size-4 accent-primary" />
          </label>
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
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Ficha técnica</span>
          <textarea
            name="fichaTecnica"
            rows={3}
            defaultValue={v("fichaTecnica", produto?.fichaTecnica ?? "")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </div>
      </SectionCard>

      {eEmbarcacaoOuMotor && (
        <SectionCard title="Dados específicos (embarcação/motor)">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Número de série" name="numeroSerie" defaultValue={v("numeroSerie", produto?.numeroSerie ?? "")} />
            <Campo label="Ano" name="anoFabricacao" defaultValue={v("anoFabricacao", produto?.anoFabricacao ?? "")} />
            <Campo label="Potência" name="potencia" defaultValue={v("potencia", produto?.potencia ?? "")} />
            <div className="sm:col-span-2">
              <Campo label="Características técnicas" name="caracteristicasTecnicas" defaultValue={v("caracteristicasTecnicas", produto?.caracteristicasTecnicas ?? "")} />
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Valores (internos — nunca aparecem para o cliente)">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoMoeda label="Custo de aquisição" name="custo" defaultValue={v("custo", produto?.custo ?? "")} />
          <CampoMoeda label="Preço de venda" name="preco" defaultValue={v("preco", produto?.preco ?? "")} />
          <CampoMoeda label="Preço promocional (se houver)" name="precoPromocional" defaultValue={v("precoPromocional", produto?.precoPromocional ?? "")} />
          <CampoMoeda label="Desconto máximo permitido" name="descontoMaximo" defaultValue={v("descontoMaximo", produto?.descontoMaximo ?? "0")} />
        </div>
        <p className="mt-2 text-body-sm text-outline">
          Custo e desconto máximo ficam visíveis somente aqui (administrativo).
        </p>
      </SectionCard>

      <SectionCard title="Observações">
        <div className="flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Observações internas</span>
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
