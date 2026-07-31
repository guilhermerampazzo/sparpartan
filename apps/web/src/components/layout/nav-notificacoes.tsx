"use client";

import { useEffect, useState } from "react";

type Contadores = {
  chat: number;
  lembretes: number;
  taxas: number;
  agenda: number;
  orcamentos: number;
};

const CONTADORES_VAZIOS: Contadores = { chat: 0, lembretes: 0, taxas: 0, agenda: 0, orcamentos: 0 };

export function useContadoresNotificacao() {
  const [contadores, setContadores] = useState<Contadores>(CONTADORES_VAZIOS);

  useEffect(() => {
    let ativo = true;

    async function buscar() {
      try {
        const res = await fetch("/api/notificacoes/contadores");
        if (!res.ok) return;
        const dados = await res.json();
        if (ativo) setContadores(dados);
      } catch {
        // silencioso — badge apenas não atualiza nesta rodada
      }
    }

    buscar();
    const intervalo = setInterval(buscar, 45000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, []);

  return contadores;
}

export function NavBadge({ total }: { total: number }) {
  if (!total) return null;
  return (
    <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-pill bg-error px-1 text-[10px] font-bold leading-none text-on-error">
      {total > 99 ? "99+" : total}
    </span>
  );
}
