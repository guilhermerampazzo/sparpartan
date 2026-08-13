import { BackButton } from "@/components/ui";
import { EmbarcacaoSparapanForm } from "./form";

export default function NovaEmbarcacaoSparapanPage() {
  return (
    <>
      <BackButton href="/documentos-sparapan/embarcacoes" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Nova Embarcação Sparapan</h1>
      <EmbarcacaoSparapanForm />
    </>
  );
}
