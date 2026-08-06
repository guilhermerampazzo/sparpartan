"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Botão "Voltar" que respeita o histórico: se o usuário chegou nesta página a
 * partir do próprio sistema, volta para a tela anterior (ex.: da listagem, do
 * processo, do cliente...). Só usa o `href` de fallback quando a página foi
 * aberta direto (link externo/reload) e não há histórico interno para voltar.
 */
export function BackButton({ href, label = "Voltar" }: { href: string; label?: string }) {
  const router = useRouter();

  function voltar() {
    try {
      const origem = document.referrer;
      if (
        origem &&
        new URL(origem).origin === window.location.origin &&
        window.history.length > 1
      ) {
        router.back();
        return;
      }
    } catch {
      // referrer inválido — cai no fallback
    }
    router.push(href);
  }

  return (
    <button
      type="button"
      onClick={voltar}
      className="inline-flex items-center gap-1.5 text-body-sm text-outline hover:text-primary hover:underline"
    >
      <ArrowLeft size={14} />
      {label}
    </button>
  );
}
