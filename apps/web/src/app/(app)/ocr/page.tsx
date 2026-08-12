import { SectionCard } from "@/components/ui/form-field";
import { OcrUploader } from "@/components/ocr/ocr-uploader";

import { BackButton } from "@/components/ui";

export default function OcrPage() {
  return (
    <div className="space-y-gutter">
      <BackButton href="/configuracoes" />
      <h1 className="font-display text-headline-lg font-bold text-primary">OCR de Documento</h1>
      <p className="max-w-2xl text-sm text-outline">
        Roda 100% no navegador (Tesseract.js) — nenhuma imagem sai do seu computador. Extrai o
        texto de uma foto de RG, CPF ou CRLV para você copiar os dados no cadastro do cliente.
      </p>

      <SectionCard title="Extrair Texto">
        <OcrUploader />
      </SectionCard>
    </div>
  );
}
