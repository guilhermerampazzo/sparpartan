"use client";

import { useRef, useState } from "react";
import { extrairCamposTaxa } from "@/lib/ocr/extrair-campos-taxa";
import { primeiraPaginaComoCanvas, textoDaPrimeiraPagina } from "@/lib/ocr/pdf-para-imagem";

function limparDigitos(valor?: string | null) {
  return (valor ?? "").replace(/\D/g, "");
}

export function OcrTaxa({
  listaClientes,
}: {
  listaClientes: { id: string; nome: string; cpfCnpj: string | null }[];
}) {
  const marcadorRef = useRef<HTMLDivElement>(null);
  const [progresso, setProgresso] = useState(0);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<"ok" | "vazio" | "erro" | null>(null);

  function preencherInput(form: HTMLFormElement, name: string, valor?: string) {
    if (!valor) return false;
    const campo = form.elements.namedItem(name);
    if (campo instanceof HTMLInputElement && !campo.value) {
      campo.value = valor;
      return true;
    }
    return false;
  }

  /**
   * CampoMoeda guarda o número num input hidden (name) e mostra o valor formatado
   * num input de texto controlado pelo React. Para o número reconhecido aparecer
   * na tela é preciso preencher os dois e disparar o evento que o React escuta.
   */
  function preencherMoeda(form: HTMLFormElement, valor?: string) {
    if (!valor) return false;
    const campo = form.elements.namedItem("valor");
    if (!(campo instanceof HTMLInputElement) || campo.value) return false;

    campo.value = valor;

    const label = campo.closest("label");
    const visual = label?.querySelector<HTMLInputElement>('input[type="text"]');
    if (visual) {
      const formatado = Number(valor.replace(",", ".")).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(visual, formatado);
      visual.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  }

  function selecionarCliente(form: HTMLFormElement, cpfCnpj?: string, nomeCliente?: string) {
    const select = form.elements.namedItem("clienteId");
    if (!(select instanceof HTMLSelectElement) || select.value) return false;

    // O cadastro pode guardar o CPF/CNPJ com ou sem máscara — compara só os dígitos.
    const porCpf =
      cpfCnpj && listaClientes.find((c) => limparDigitos(c.cpfCnpj) === limparDigitos(cpfCnpj));
    const porNome =
      !porCpf &&
      nomeCliente &&
      listaClientes.find((c) => c.nome.toLowerCase() === nomeCliente.toLowerCase());
    const encontrado = porCpf || porNome;
    if (!encontrado) return false;

    select.value = encontrado.id;
    return true;
  }

  async function processarArquivo(file: File) {
    setProcessando(true);
    setResultado(null);
    setProgresso(0);

    try {
      let texto: string | null = null;

      // PDFs digitais (gerados por sistema) têm camada de texto exata — tenta primeiro.
      try {
        texto = await textoDaPrimeiraPagina(file);
      } catch {
        texto = null;
      }

      // Vazio/escaneado: cai para OCR com Tesseract sobre a imagem da página.
      if (!texto || texto.trim().length < 20) {
        setProgresso(5);
        const canvas = await primeiraPaginaComoCanvas(file);

        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("por", 1, {
          logger: (m) => {
            if (m.status === "recognizing text") setProgresso(Math.round(m.progress * 100));
          },
        });

        const {
          data: { text },
        } = await worker.recognize(canvas);
        await worker.terminate();
        texto = text;
      }

      const campos = extrairCamposTaxa(texto);
      const form = marcadorRef.current?.closest("form");
      let achouAlgo = false;
      if (form) {
        if (preencherInput(form, "numero", campos.numero)) achouAlgo = true;
        if (preencherInput(form, "vencimento", campos.validade)) achouAlgo = true;
        if (preencherInput(form, "descricao", campos.servicoNome)) achouAlgo = true;
        if (preencherMoeda(form, campos.valor)) achouAlgo = true;
        if (selecionarCliente(form, campos.cpfCnpj, campos.nomeCliente)) achouAlgo = true;
      }

      setResultado(achouAlgo ? "ok" : "vazio");
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
          Reconhecer dados automaticamente a partir do PDF anexado acima
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
        <p className="text-body-sm text-success">Campos preenchidos — confira antes de salvar.</p>
      )}
      {resultado === "vazio" && (
        <p className="text-body-sm text-outline">
          Não consegui reconhecer os dados nesse PDF. Preencha manualmente.
        </p>
      )}
      {resultado === "erro" && (
        <p className="text-body-sm text-outline">
          Não foi possível ler esse arquivo automaticamente. Preencha manualmente.
        </p>
      )}
    </div>
  );
}
