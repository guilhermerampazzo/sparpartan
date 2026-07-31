"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoMoeda } from "@/components/ui";
import { criarOrcamento } from "../actions";
import type { EstadoForm } from "@/lib/validacao";
import { NovoClienteInline } from "./novo-cliente-inline";
import { NovaEmbarcacaoInline } from "./nova-embarcacao-inline";

export function NovoOrcamentoForm({
  listaClientes,
  listaServicos,
  listaEmbarcacoes,
  listaContasBancarias,
  orcamentoInicial,
  action = criarOrcamento,
  submitLabel = "Criar Orçamento",
}: {
  listaClientes: { id: string; nome: string }[];
  listaServicos: { id: string; nome: string; valor: string | null }[];
  listaEmbarcacoes: { id: string; nome: string; clienteId: string }[];
  listaContasBancarias: { id: string; apelido: string }[];
  orcamentoInicial?: Record<string, unknown>;
  action?: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  submitLabel?: string;
}) {
  const [estado, formAction] = useActionState(action, null);
  const v = (nome: string): string | number =>
    (estado?.valores?.[nome] as string | undefined) ??
    ((orcamentoInicial?.[nome] as string | number | null | undefined) ?? "");

  const [clientes, setClientes] = useState(listaClientes);
  const [embarcacoesTodas, setEmbarcacoesTodas] = useState(listaEmbarcacoes);
  const [clienteId, setClienteId] = useState(String(v("clienteId")));
  const [servicoLivre, setServicoLivre] = useState(!v("servicoId"));

  const embarcacoesDoCliente = useMemo(
    () => embarcacoesTodas.filter((e) => e.clienteId === clienteId),
    [embarcacoesTodas, clienteId]
  );

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

          <CampoMoeda label="Valor" name="valor" required defaultValue={v("valor")} />
          <Campo label="Válido até" name="validoAte" type="date" defaultValue={v("validoAte")} />
        </div>
        <label className="mt-4 flex flex-col gap-1">
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
        <label className="mt-4 flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Observações (aparece no PDF)
          </span>
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={v("observacoes")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>

        <div className="mt-4">
          <CampoSelect
            label="Dados bancários para pagamento (opcional, aparece no PDF)"
            name="contaBancariaId"
            defaultValue={String(v("contaBancariaId"))}
            options={[
              { value: "", label: "—" },
              ...listaContasBancarias.map((c) => ({ value: c.id, label: c.apelido })),
            ]}
          />
        </div>
      </SectionCard>

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
