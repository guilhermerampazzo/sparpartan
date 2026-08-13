import { BackButton } from "@/components/ui";
import { FornecedorForm } from "./form";

export default function NovoFornecedorPage() {
  return (
    <>
      <BackButton href="/loja/fornecedores" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Fornecedor</h1>
      <FornecedorForm />
    </>
  );
}
