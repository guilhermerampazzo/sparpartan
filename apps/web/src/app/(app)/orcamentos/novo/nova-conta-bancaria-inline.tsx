"use client";

import { useActionState, useEffect, useState } from "react";
import { Campo } from "@/components/ui/form-field";
import { Button, FormError } from "@/components/ui";
import { criarContaBancariaRapida } from "../actions";

export function NovaContaBancariaInline({
  onCriada,
}: {
  onCriada: (conta: { id: string; apelido: string }) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [estado, formAction] = useActionState(criarContaBancariaRapida, null);

  useEffect(() => {
    if (estado && "conta" in estado && estado.conta) {
      onCriada(estado.conta);
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
        + Nova conta bancária
      </button>
    );
  }

  const valores = estado && "valores" in estado ? estado.valores : undefined;

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-outline-variant p-4">
      <FormError erro={estado && "erro" in estado ? estado.erro : undefined} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo label="Apelido" name="contaNovoApelido" required defaultValue={valores?.contaNovoApelido} />
        <Campo label="Banco" name="contaNovoBanco" defaultValue={valores?.contaNovoBanco} />
        <Campo label="Agência" name="contaNovoAgencia" defaultValue={valores?.contaNovoAgencia} />
        <Campo label="Conta" name="contaNovoNumero" defaultValue={valores?.contaNovoNumero} />
        <Campo label="PIX" name="contaNovoPix" defaultValue={valores?.contaNovoPix} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" formAction={formAction} formNoValidate size="sm">
          Salvar Conta
        </Button>
        <Button type="button" variant="outlined" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
