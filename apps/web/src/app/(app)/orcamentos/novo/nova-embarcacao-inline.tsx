"use client";

import { useActionState, useEffect, useState } from "react";
import { Campo } from "@/components/ui/form-field";
import { Button, FormError } from "@/components/ui";
import { criarEmbarcacaoRapida } from "../../embarcacoes/actions";

export function NovaEmbarcacaoInline({
  clienteId,
  onCriada,
}: {
  clienteId: string;
  onCriada: (embarcacao: { id: string; nome: string }) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction] = useActionState(criarEmbarcacaoRapida, null);

  useEffect(() => {
    if (estado && "embarcacao" in estado && estado.embarcacao) {
      onCriada(estado.embarcacao);
      setAberto(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (!clienteId) return null;

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-body-sm font-medium text-primary hover:underline"
      >
        + Nova embarcação
      </button>
    );
  }

  const valores = estado && "valores" in estado ? estado.valores : undefined;

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-outline-variant p-4">
      <FormError erro={estado && "erro" in estado ? estado.erro : undefined} />
      <input type="hidden" name="embarcacaoNovaClienteId" value={clienteId} />
      <Campo
        label="Nome da embarcação"
        name="embarcacaoNovaNome"
        required
        defaultValue={valores?.embarcacaoNovaNome}
      />
      <div className="flex gap-2">
        <Button type="submit" formAction={formAction} formNoValidate size="sm">
          Salvar Embarcação
        </Button>
        <Button type="button" variant="outlined" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
