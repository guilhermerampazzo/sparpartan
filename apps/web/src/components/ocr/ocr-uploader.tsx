"use client";

import { useState } from "react";
import { primeiraPaginaComoCanvas } from "@/lib/ocr/pdf-para-imagem";

function ehPdf(nome: string): boolean {
  return nome.toLowerCase().endsWith(".pdf");
}

export function OcrUploader() {
  const [texto, setTexto] = useState("");
  const [progresso, setProgresso] = useState(0);
  const [processando, setProcessando] = useState(false);

  async function processarArquivo(file: File) {
    setProcessando(true);
    setTexto("");
    setProgresso(0);

    // PDF (CNH Digital etc.) vira imagem antes de ir pro Tesseract.
    let alvo: Blob | HTMLCanvasElement = file;
    if (ehPdf(file.name)) {
      try {
        alvo = await primeiraPaginaComoCanvas(file);
      } catch {
        setTexto("Não foi possível ler este PDF.");
        setProcessando(false);
        return;
      }
    }

    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("por", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          setProgresso(Math.round(m.progress * 100));
        }
      },
    });

    const {
      data: { text },
    } = await worker.recognize(alvo);
    await worker.terminate();

    setTexto(text);
    setProcessando(false);
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1">
        <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
          Foto do documento (RG, CRLV, etc.) ou PDF
        </span>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processarArquivo(file);
          }}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        />
      </label>

      {processando && (
        <p className="text-sm text-outline">Processando... {progresso}%</p>
      )}

      {texto && (
        <div>
          <p className="mb-2 font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Texto Extraído (copie o que precisar)
          </p>
          <textarea
            readOnly
            value={texto}
            rows={12}
            className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 font-mono text-xs text-primary"
          />
        </div>
      )}
    </div>
  );
}
