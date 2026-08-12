import { SearchX } from "lucide-react";
import { BackButton } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="rounded-pill bg-surface-container-high p-4 text-outline">
        <SearchX size={28} />
      </span>
      <div>
        <h1 className="font-display text-headline-md font-bold text-primary">
          Página não encontrada
        </h1>
        <p className="mt-2 text-body-md text-outline">
          O registro pode ter sido excluído ou o endereço está errado.
        </p>
      </div>
      <BackButton href="/" label="Voltar para a Home" />
    </div>
  );
}
