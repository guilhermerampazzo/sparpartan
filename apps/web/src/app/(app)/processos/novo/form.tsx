"use client";

import { useState, useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, Button, CampoCnpj } from "@/components/ui";
import { criarProcesso } from "../actions";

export function NovoProcessoForm({
  listaClientes,
  listaServicos,
  listaUsuarios,
  clienteInicial,
  servicoInicial,
}: {
  listaClientes: { id: string; nome: string }[];
  listaServicos: { id: string; nome: string }[];
  listaUsuarios: { id: string; nome: string }[];
  clienteInicial?: string;
  servicoInicial?: string;
}) {
  const [estado, formAction] = useActionState(criarProcesso, null);
  const [modoCliente, setModoCliente] = useState<"existente" | "novo">("existente");
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="1. Cliente e Serviço">
        <input type="hidden" name="modoCliente" value={modoCliente} />

        <div className="mb-4 flex gap-2">
          <Button
            type="button"
            variant={modoCliente === "existente" ? "filled" : "outlined"}
            size="sm"
            onClick={() => setModoCliente("existente")}
          >
            Cliente já cadastrado
          </Button>
          <Button
            type="button"
            variant={modoCliente === "novo" ? "filled" : "outlined"}
            size="sm"
            onClick={() => setModoCliente("novo")}
          >
            + Cadastrar cliente agora
          </Button>
        </div>

        {modoCliente === "existente" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CampoSelect
              label="Cliente"
              name="clienteId"
              required
              defaultValue={v("clienteId") || clienteInicial || ""}
              options={[
                { value: "", label: "Selecione..." },
                ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
              ]}
            />
            <CampoSelect
              label="Serviço"
              name="servicoId"
              required
              defaultValue={v("servicoId") || servicoInicial || ""}
              options={[
                { value: "", label: "Selecione..." },
                ...listaServicos.map((s) => ({ value: s.id, label: s.nome })),
              ]}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nome do Cliente" name="clienteNovoNome" required defaultValue={v("clienteNovoNome")} />
            <CampoCnpj
              label="CPF/CNPJ"
              name="clienteNovoCpfCnpj"
              required
              defaultValue={v("clienteNovoCpfCnpj")}
              camposEmpresa={{ nome: "clienteNovoNome" }}
            />
            <Campo label="Telefone" name="clienteNovoTelefone" defaultValue={v("clienteNovoTelefone")} />
            <CampoSelect
              label="Serviço"
              name="servicoId"
              required
              defaultValue={v("servicoId")}
              options={[
                { value: "", label: "Selecione..." },
                ...listaServicos.map((s) => ({ value: s.id, label: s.nome })),
              ]}
            />
          </div>
        )}

        <div className="mt-4">
          <CampoSelect
            label="Responsável pelo Atendimento"
            name="responsavelId"
            defaultValue={v("responsavelId")}
            options={[
              { value: "", label: "Não atribuído" },
              ...listaUsuarios.map((u) => ({ value: u.id, label: u.nome })),
            ]}
          />
        </div>

        <p className="mt-4 text-sm text-outline">
          Embarcação e checklist de anexos são configurados na próxima tela — é obrigatório
          vincular uma embarcação antes de confirmar o protocolo.
        </p>
      </SectionCard>

      <SubmitButton>Abrir Processo</SubmitButton>
    </form>
  );
}
