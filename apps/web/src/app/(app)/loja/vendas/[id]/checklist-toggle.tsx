"use client";

import { useTransition } from "react";
import { alternarChecklistVenda } from "../actions";

export function ChecklistToggle({
  vendaId,
  itemId,
  concluido,
}: {
  vendaId: string;
  itemId: string;
  concluido: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      defaultChecked={concluido}
      disabled={pending}
      onChange={(e) => {
        const novoValor = e.target.checked;
        startTransition(() => {
          alternarChecklistVenda(vendaId, itemId, novoValor);
        });
      }}
      className="h-4 w-4 accent-primary"
    />
  );
}
