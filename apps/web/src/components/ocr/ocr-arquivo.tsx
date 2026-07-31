"use client";

import { useRef, useState } from "react";
import { todasPaginasComoCanvas } from "@/lib/ocr/pdf-para-imagem";

/**
 * Lê um PDF anexado (comprovante de endereço, CNH, documento de embarcação
 * etc.) via OCR e guarda o texto reconhecido num campo oculto do formulário,
 * para permitir busca posterior na listagem de Arquivos. Mesmo padrão do
 * `OcrTaxa`, mas guardando o texto inteiro em vez de preencher campos.
 */
export function OcrArquivo({ campoDestino = "textoExtraido" }: { campoDestino?: string }) {
  const marcadorRef = useRef<HTMLDivElement>(null);
  const [progresso, setProgresso] = useState(0);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<"ok" | "vazio" | "erro" | null>(null);

  async function processarArquivo(file: File) {
    setProcessando(true);
    setResultado(null);
    setProgresso(0);

    try {
      const canvases = await todasPaginasComoCanvas(file);

      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("por", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") setProgresso(Math.round(m.progress * 100));
        },
      });

      const textos: string[] = [];
      for (const canvas of canvases) {
        const {
          data: { text },
        } = await worker.recognize(canvas);
        textos.push(text.trim());
      }
      await worker.terminate();

      const textoCompleto = textos.join("\n\n").trim();

      const form = marcadorRef.current?.closest("form");
      const campo = form?.elements.namedItem(campoDestino);
      if (campo instanceof HTMLTextAreaElement || campo instanceof HTMLInputElement) {
        campo.value = textoCompleto;
      }

      setResultado(textoCompleto ? "ok" : "vazio");
    } catch {
      setResultado("erro");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div ref={marcadorRef} className="space-y-2 rounded-lg border border-dashed border-outline-variant p-4">
      <label className="flex flex-col gap-1">
        <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
          Ler texto do PDF para permitir busca depois (opcional)
        </span>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processarArquivo(file);
          }}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        />
      </label>

      {processando && <p className="text-body-sm text-outline">Lendo documento... {progresso}%</p>}
      {resultado === "ok" && (
        <p className="text-body-sm text-success">Texto reconhecido e pronto para ser salvo com o arquivo.</p>
      )}
      {resultado === "vazio" && (
        <p className="text-body-sm text-outline">Não consegui reconhecer texto nesse PDF.</p>
      )}
      {resultado === "erro" && (
        <p className="text-body-sm text-outline">Não foi possível ler esse arquivo automaticamente.</p>
      )}
    </div>
  );
}
