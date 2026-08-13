"use client";

import { useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { Button, FormError } from "@/components/ui";
import { Campo, CampoSelect } from "@/components/ui/form-field";
import { criarDocumentoEmpresa } from "../actions";
import { TIPOS_DOCUMENTO_EMPRESA } from "@/lib/empresas-opcoes";
import { extrairCamposDocumentoEmpresa } from "@/lib/empresas-ocr";

type EmbarcacaoOpcao = { id: string; nome: string };

/** Form de documento com leitura automática do PDF anexado (revisar antes de salvar). */
export function DocumentoEmpresaForm({
  empresaId,
  embarcacoes,
}: {
  empresaId: string;
  embarcacoes: EmbarcacaoOpcao[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [processando, setProcessando] = useState(false);
  const [reconhecido, setReconhecido] = useState(false);

  async function processarArquivo(file: File) {
    if (!file || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) return;
    setProcessando(true);
    setReconhecido(false);
    try {
      const texto = await textoDoPdf(file);
      if (!texto) return;
      const campos = extrairCamposDocumentoEmpresa(texto);
      const set = (name: string, valor: string | undefined) => {
        if (!valor) return;
        const el = formRef.current?.elements.namedItem(name);
        if (el instanceof HTMLInputElement && !el.value) el.value = valor;
        if (el instanceof HTMLSelectElement && !el.value) el.value = valor;
      };
      set("cnpj", campos.cnpj);
      set("numero", campos.numero);
      set("dataEmissao", campos.dataEmissao);
      set("dataVencimento", campos.dataVencimento);
      set("tipo", campos.tipoSugerido);
      if (campos.cnpj || campos.numero || campos.dataVencimento) setReconhecido(true);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <form ref={formRef} action={criarDocumentoEmpresa.bind(null, empresaId)} className="space-y-3 rounded-lg border border-outline-variant p-3">
      <p className="flex items-center gap-1 text-body-sm text-outline">
        <ScanLine size={14} /> Anexe o PDF — a leitura automática tenta identificar tipo, número, datas e CNPJ (revise antes de salvar).
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CampoSelect
          label="Tipo do documento *"
          name="tipo"
          required
          options={[
            { value: "", label: "— selecione —" },
            ...TIPOS_DOCUMENTO_EMPRESA.map((t) => ({ value: t.valor, label: t.rotulo })),
          ]}
        />
        <CampoSelect
          label="Embarcação (se aplicável)"
          name="embarcacaoId"
          options={[
            { value: "", label: "—" },
            ...embarcacoes.map((e) => ({ value: e.id, label: e.nome })),
          ]}
        />
        <Campo label="Título" name="titulo" />
        <Campo label="Número" name="numero" />
        <Campo label="CNPJ" name="cnpj" />
        <Campo label="Data de emissão" name="dataEmissao" type="date" />
        <Campo label="Data de vencimento" name="dataVencimento" type="date" />
        <Campo label="Observações" name="observacoes" />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">PDF/anexo</span>
          <input
            name="arquivo"
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void processarArquivo(f);
            }}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>
        <Button type="submit" size="sm">
          {processando ? "Lendo documento..." : "Adicionar Documento"}
        </Button>
      </div>
      {reconhecido && (
        <p className="rounded-lg bg-success-container px-3 py-2 text-body-sm text-on-success-container">
          Dados reconhecidos do PDF — confira e ajuste antes de salvar.
        </p>
      )}
      <FormError />
    </form>
  );
}

/** Extrai o texto da primeira página de um PDF (pdfjs, como nos demais módulos). */
async function textoDoPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pagina = await doc.getPage(1);
  const conteudo = await pagina.getTextContent();
  return conteudo.items
    .map((item) => ("str" in item ? (item as { str: string }).str : ""))
    .join(" ");
}
