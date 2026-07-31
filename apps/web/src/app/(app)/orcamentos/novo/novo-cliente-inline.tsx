"use client";

import { useActionState, useEffect, useState } from "react";
import { Campo } from "@/components/ui/form-field";
import { Button, FormError } from "@/components/ui";
import { criarClienteRapido } from "../../clientes/actions";

export function NovoClienteInline({
  onCriado,
}: {
  onCriado: (cliente: { id: string; nome: string }) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction] = useActionState(criarClienteRapido, null);

  useEffect(() => {
    if (estado && "cliente" in estado && estado.cliente) {
      onCriado(estado.cliente);
      setAberto(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-body-sm font-medium text-primary hover:underline"
      >
        + Novo cliente
      </button>
    );
  }

  const valores = estado && "valores" in estado ? estado.valores : undefined;

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-outline-variant p-4">
      <FormError erro={estado && "erro" in estado ? estado.erro : undefined} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo label="Nome" name="clienteNovoNome" required defaultValue={valores?.clienteNovoNome} />
        <Campo
          label="CPF/CNPJ"
          name="clienteNovoCpfCnpj"
          required
          defaultValue={valores?.clienteNovoCpfCnpj}
        />
        <Campo label="Telefone" name="clienteNovoTelefone" defaultValue={valores?.clienteNovoTelefone} />
        <Campo
          label="E-mail"
          name="clienteNovoEmail"
          type="email"
          defaultValue={valores?.clienteNovoEmail}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" formAction={formAction} formNoValidate size="sm">
          Salvar Cliente
        </Button>
        <Button type="button" variant="outlined" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
