"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoMoeda, LinkButton } from "@/components/ui";
import { criarOrcamento } from "../actions";
import type { EstadoForm } from "@/lib/validacao";
import { NovoClienteInline } from "./novo-cliente-inline";
import { NovaEmbarcacaoInline } from "./nova-embarcacao-inline";
import { NovaContaBancariaInline } from "./nova-conta-bancaria-inline";

const MAX_ITENS = 20;

type ItemForm = { id: number; descricao: string; quantidade: string; valor: string };

let proximoIdItem = 1;

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function itensIniciais(itens: { descricao: string; quantidade: number; valorUnitario: string }[]) {
  return itens.map((item) => ({
    id: proximoIdItem++,
    descricao: item.descricao,
    quantidade: String(item.quantidade),
    valor: String(Number(item.valorUnitario) || ""),
  }));
}

export function NovoOrcamentoForm({
  listaClientes,
  listaServicos,
  listaEmbarcacoes,
  listaContasBancarias,
  orcamentoInicial,
  itensIniciais: itensParaEdicao = [],
  action = criarOrcamento,
  submitLabel = "Criar Orçamento",
}: {
  listaClientes: { id: string; nome: string }[];
  listaServicos: { id: string; nome: string; valor: string | null }[];
  listaEmbarcacoes: { id: string; nome: string; clienteId: string }[];
  listaContasBancarias: { id: string; apelido: string }[];
  orcamentoInicial?: Record<string, unknown>;
  itensIniciais?: { descricao: string; quantidade: number; valorUnitario: string }[];
  action?: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  submitLabel?: string;
}) {
  const [estado, formAction] = useActionState(action, null);
  const v = (nome: string): string | number =>
    (estado?.valores?.[nome] as string | undefined) ??
    ((orcamentoInicial?.[nome] as string | number | null | undefined) ?? "");

  const [clientes, setClientes] = useState(listaClientes);
  const [embarcacoesTodas, setEmbarcacoesTodas] = useState(listaEmbarcacoes);
  const [contasBancarias, setContasBancarias] = useState(listaContasBancarias);
  const [clienteId, setClienteId] = useState(String(v("clienteId")));
  const [servicoLivre, setServicoLivre] = useState(!v("servicoId"));
  const [itens, setItens] = useState<ItemForm[]>(() => itensIniciais(itensParaEdicao));

  const embarcacoesDoCliente = useMemo(
    () => embarcacoesTodas.filter((e) => e.clienteId === clienteId),
    [embarcacoesTodas, clienteId]
  );

  const total = useMemo(
    () =>
      itens.reduce((acc, item) => {
        const quantidade = Number(item.quantidade) > 0 ? Number(item.quantidade) : 1;
        return acc + (Number(item.valor) || 0) * quantidade;
      }, 0),
    [itens]
  );

  const atualizarItem = (id: number, campo: Partial<ItemForm>) =>
    setItens((atual) => atual.map((item) => (item.id === id ? { ...item, ...campo } : item)));

  const adicionarItem = () =>
    setItens((atual) => [...atual, { id: proximoIdItem++, descricao: "", quantidade: "1", valor: "" }]);

  const removerItem = (id: number) => setItens((atual) => atual.filter((item) => item.id !== id));

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Dados do Orçamento">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <CampoSelect
              label="Cliente"
              name="clienteId"
              required
              defaultValue={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              options={[
                { value: "", label: "Selecione..." },
                ...clientes.map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
            <NovoClienteInline
              onCriado={(cliente) => {
                setClientes((atual) => [...atual, cliente].sort((a, b) => a.nome.localeCompare(b.nome)));
                setClienteId(cliente.id);
              }}
            />
          </div>

          <div className="space-y-2">
            <CampoSelect
              label="Embarcação (opcional)"
              name="embarcacaoId"
              defaultValue={String(v("embarcacaoId"))}
              options={[
                { value: "", label: "—" },
                ...embarcacoesDoCliente.map((e) => ({ value: e.id, label: e.nome })),
              ]}
            />
            <NovaEmbarcacaoInline
              clienteId={clienteId}
              onCriada={(embarcacao) => {
                setEmbarcacoesTodas((atual) => [...atual, { ...embarcacao, clienteId }]);
              }}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center gap-4">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                Serviço *
              </span>
              <label className="flex items-center gap-1.5 text-body-sm text-primary">
                <input
                  type="radio"
                  checked={!servicoLivre}
                  onChange={() => setServicoLivre(false)}
                />
                Da lista
              </label>
              <label className="flex items-center gap-1.5 text-body-sm text-primary">
                <input type="radio" checked={servicoLivre} onChange={() => setServicoLivre(true)} />
                Digitar (serviço avulso)
              </label>
            </div>
            {!servicoLivre ? (
              <CampoSelect
                label="Serviço cadastrado"
                name="servicoId"
                required={!servicoLivre}
                defaultValue={String(v("servicoId"))}
                options={[
                  { value: "", label: "Selecione..." },
                  ...listaServicos.map((s) => ({ value: s.id, label: s.nome })),
                ]}
              />
            ) : (
              <Campo
                label="Nome do serviço avulso"
                name="servicoLivreNome"
                required={servicoLivre}
                defaultValue={v("servicoLivreNome")}
              />
            )}
          </div>

          <Campo label="Válido até" name="validoAte" type="date" defaultValue={v("validoAte")} />

          <CampoSelect
            label="Forma de pagamento"
            name="formaPagamento"
            defaultValue={String(v("formaPagamento"))}
            options={[
              { value: "", label: "Selecione..." },
              { value: "A VISTA", label: "À vista" },
              { value: "PIX", label: "PIX" },
              { value: "BOLETO", label: "Boleto" },
              { value: "TRANSFERENCIA", label: "Transferência" },
              { value: "CARTAO_CREDITO", label: "Cartão de crédito" },
              { value: "CARTAO_DEBITO", label: "Cartão de débito" },
            ]}
          />

          <div className="space-y-2">
            <CampoSelect
              label="Dados bancários para pagamento (opcional, aparece no PDF)"
              name="contaBancariaId"
              defaultValue={String(v("contaBancariaId"))}
              options={[
                { value: "", label: "—" },
                ...contasBancarias.map((c) => ({ value: c.id, label: c.apelido })),
              ]}
            />
            <div className="flex flex-wrap items-center gap-3">
              <NovaContaBancariaInline
                onCriada={(conta) => {
                  setContasBancarias((atual) => [...atual, conta].sort((a, b) => a.apelido.localeCompare(b.apelido)));
                }}
              />
              <LinkButton href="/configuracoes/contas-bancarias" variant="text" size="sm">
                Gerenciar contas
              </LinkButton>
            </div>
          </div>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
              Condição de pagamento (ex.: Entrada de R$ 500 e o restante em 3 vezes)
            </span>
            <input
              name="condicaoPagamento"
              defaultValue={v("condicaoPagamento")}
              placeholder="Entrada e restante em X vezes"
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Itens do Orçamento">
        {itens.length === 0 ? (
          <div className="space-y-4">
            <CampoMoeda label="Valor" name="valor" required defaultValue={v("valor")} />
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                Descrição do item/serviço (aparece no PDF)
              </span>
              <textarea
                name="descricao"
                rows={2}
                defaultValue={v("descricao")}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              />
            </label>
            <button
              type="button"
              onClick={adicionarItem}
              className="flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
            >
              <Plus size={14} /> Adicionar itens ao orçamento
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {itens.map((item, i) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-3 sm:grid-cols-[1fr_80px_140px_auto]"
                >
                  <label className="flex flex-col gap-1">
                    <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                      Descrição
                    </span>
                    <input
                      name={`itemDescricao${i}`}
                      value={item.descricao}
                      onChange={(e) => atualizarItem(item.id, { descricao: e.target.value })}
                      placeholder="Ex.: Acompanhamento de processo NORMAM-211"
                      className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                      Qtd.
                    </span>
                    <input
                      type="number"
                      name={`itemQuantidade${i}`}
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => atualizarItem(item.id, { quantidade: e.target.value })}
                      className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                    />
                  </label>
                  <CampoMoeda
                    label="Valor unitário"
                    name={`itemValor${i}`}
                    defaultValue={item.valor}
                    onChange={(valor) => atualizarItem(item.id, { valor })}
                  />
                  <button
                    type="button"
                    onClick={() => removerItem(item.id)}
                    title="Remover item"
                    className="self-end rounded-lg border border-outline-variant p-2 text-outline transition-colors hover:border-danger hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {itens.length < MAX_ITENS && (
              <button
                type="button"
                onClick={adicionarItem}
                className="mt-3 flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
              >
                <Plus size={14} /> Adicionar item
              </button>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-3">
              <span className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                Total do orçamento
              </span>
              <span className="font-display text-lg font-bold text-primary">{formatMoney(total)}</span>
            </div>
          </>
        )}
      </SectionCard>

      <SectionCard title="Observações (aparece no PDF)">
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={v("observacoes")}
          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        />
      </SectionCard>

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
