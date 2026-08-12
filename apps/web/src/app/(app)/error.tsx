"use client";

import { useEffect } from "react";
import { AlertOctagon } from "lucide-react";
import { Button, BackButton } from "@/components/ui";

export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no app Sparapan", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="rounded-pill bg-danger-container p-4 text-on-danger-container">
        <AlertOctagon size={28} />
      </span>
      <div>
        <h1 className="font-display text-headline-md font-bold text-primary">
          Algo deu errado
        </h1>
        <p className="mt-2 max-w-md text-body-md text-outline">
          {error.message || "Nao foi possivel concluir a operacao."}
        </p>
        {error.digest && (
          <p className="mt-2 font-mono-caps text-[11px] uppercase text-outline">
            Codigo do erro: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <BackButton href="/" label="Voltar para a Home" />
      </div>
    </div>
  );
}
