import { ProdutoLojaForm } from "../produto-form";

import { BackButton } from "@/components/ui";

export default function NovoProdutoLojaPage() {
  return (
    <div className="space-y-gutter">
      <BackButton href="/loja/catalogo" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Produto</h1>
      <ProdutoLojaForm />
    </div>
  );
}
