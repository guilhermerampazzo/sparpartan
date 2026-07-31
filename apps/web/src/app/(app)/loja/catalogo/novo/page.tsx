import { ProdutoLojaForm } from "../produto-form";

export default function NovoProdutoLojaPage() {
  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Produto</h1>
      <ProdutoLojaForm />
    </div>
  );
}
