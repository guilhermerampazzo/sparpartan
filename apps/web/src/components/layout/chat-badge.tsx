"use client";

import { useEffect, useState } from "react";
import { NavBadge } from "./nav-notificacoes";

/** Badge de mensagens não lidas do chat — fetch leve da API de recentes. */
export function ChatBadge() {
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function buscar() {
      try {
        const res = await fetch("/api/chat/recentes");
        if (!res.ok) return;
        const dados = await res.json();
        if (ativo) setNaoLidas(dados.naoLidas ?? 0);
      } catch {
        // silencioso
      }
    }

    buscar();
    const intervalo = setInterval(buscar, 30000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, []);

  return <NavBadge total={naoLidas} />;
}
