"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, X } from "lucide-react";

export function AvisoAcessoNegado() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (searchParams.get("erro") === "acesso-negado") {
      setVisivel(true);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  if (!visivel) return null;

  return (
    <div className="mb-gutter flex items-center gap-3 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
      <ShieldAlert size={18} className="shrink-0" />
      <p className="flex-1">Você não tem permissão para acessar essa área.</p>
      <button type="button" onClick={() => setVisivel(false)} aria-label="Fechar aviso">
        <X size={16} />
      </button>
    </div>
  );
}
