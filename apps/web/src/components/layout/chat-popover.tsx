"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { NavBadge } from "./nav-notificacoes";

type MensagemRecente = {
  id: string;
  usuarioNome: string;
  corpo: string;
  criadoEm: string;
  destinatarioId: string | null;
};

export function ChatPopover() {
  const [aberto, setAberto] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [mensagens, setMensagens] = useState<MensagemRecente[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;

    async function buscar() {
      try {
        const res = await fetch("/api/chat/recentes");
        if (!res.ok) return;
        const dados = await res.json();
        if (ativo) {
          setNaoLidas(dados.naoLidas ?? 0);
          setMensagens(dados.mensagens ?? []);
        }
      } catch {
        // silencioso
      }
    }

    buscar();
    const intervalo = setInterval(buscar, 20000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function abrirPopover() {
    const abrirAgora = !aberto;
    setAberto(abrirAgora);
    if (abrirAgora && naoLidas > 0) {
      fetch("/api/chat/recentes", { method: "POST" }).then(() => setNaoLidas(0));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={abrirPopover}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-nav-text/70 hover:bg-nav-text/10"
      >
        <MessageSquare size={18} strokeWidth={2} />
        <span className="font-mono-caps text-[11px] uppercase tracking-wide">Chat da Equipe</span>
        <NavBadge total={naoLidas} />
      </button>

      {aberto && (
        <div className="absolute left-full top-0 z-50 ml-2 w-80 rounded-xl border border-outline-variant bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <p className="font-display text-title-sm font-semibold text-primary">Chat da Equipe</p>
            <Link href="/chat" className="text-body-sm text-primary underline" onClick={() => setAberto(false)}>
              Abrir chat
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto p-3">
            {mensagens.length === 0 ? (
              <p className="py-6 text-center text-body-sm text-outline">Nenhuma mensagem recente</p>
            ) : (
              <ul className="space-y-2">
                {mensagens.map((m) => (
                  <li key={m.id} className="rounded-lg bg-surface-container-low px-3 py-2">
                    <p className="font-mono-caps text-[10px] uppercase text-outline">
                      {m.usuarioNome}
                      {m.destinatarioId ? " (privado)" : ""}
                    </p>
                    <p className="truncate text-body-sm text-primary">{m.corpo || "[anexo]"}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
