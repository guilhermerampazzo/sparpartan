"use client";

import { useActionState, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { Campo, CampoSelect } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoMoeda } from "@/components/ui";
import { extrairCamposTaxa } from "@/lib/ocr/extrair-campos-taxa";
import { primeiraPaginaComoCanvas, textoDaPrimeiraPagina } from "@/lib/ocr/pdf-para-imagem";
import { criarTaxa } from "../actions";

type ClienteOpcao = { id: string; nome: string; cpfCnpj: string | null };
type ProcessoOpcao = { id: string; clienteId: string | null; label: string };

function limparDigitos(valor?: string | null) {
  return (valor ?? "").replace(/\D/g, "");
}

export function NovaTaxaForm({
  listaClientes,
  listaProcessos,
}: {
  listaClientes: ClienteOpcao[];
  listaProcessos: ProcessoOpcao[];
}) {
  const [estado, formAction] = useActionState(criarTaxa, null);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState<"ok" | "vazio" | "erro" | null>(null);
  const [documentoPago, setDocumentoPago] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [processoVinculado, setProcessoVinculado] = useState("");
  const marcadorRef = useRef<HTMLDivElement>(null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  function preencherInput(form: HTMLFormElement, name: string, valor?: string) {
    if (!valor) return false;
    const campo = form.elements.namedItem(name);
    if (campo instanceof HTMLInputElement && !campo.value) {
      campo.value = valor;
      return true;
    }
    return false;
  }

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

  /** Acha o cliente na base por CPF/CNPJ (dígitos) ou nome exato. */
  function acharCliente(cpfCnpj?: string, nomeCliente?: string): ClienteOpcao | undefined {
    if (cpfCnpj) {
      const porCpf = listaClientes.find((c) => limparDigitos(c.cpfCnpj) === limparDigitos(cpfCnpj));
      if (porCpf) return porCpf;
    }
    if (nomeCliente) {
      const porNome = listaClientes.find((c) => c.nome.toLowerCase() === nomeCliente.toLowerCase());
      if (porNome) return porNome;
    }
    return undefined;
  }

  async function processarArquivo(file: File) {
    setProcessando(true);
    setResultado(null);
    setProgresso(0);

    try {
      let texto: string | null = null;
      try {
        texto = await textoDaPrimeiraPagina(file);
      } catch {
        texto = null;
      }

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

        // Vínculo automático: cliente por CPF/CNPJ ou nome + processo ativo dele.
        const cliente = acharCliente(campos.cpfCnpj, campos.nomeCliente);
        if (cliente) {
          setClienteSelecionado(cliente.id);
          achouAlgo = true;
          const selectCliente = form.elements.namedItem("clienteId");
          if (selectCliente instanceof HTMLSelectElement && !selectCliente.value) {
            selectCliente.value = cliente.id;
          }
          const processosDoCliente = listaProcessos.filter((p) => p.clienteId === cliente.id);
          if (processosDoCliente.length > 0) {
            const processoId = processosDoCliente[processosDoCliente.length - 1].id;
            setProcessoVinculado(processoId);
            const selectProcesso = form.elements.namedItem("processoId");
            if (selectProcesso instanceof HTMLSelectElement && !selectProcesso.value) {
              selectProcesso.value = processoId;
            }
          }
        }

        if (campos.paga) setDocumentoPago(true);
      }

      setResultado(achouAlgo ? "ok" : "vazio");
    } catch {
      setResultado("erro");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <form
      action={formAction}
      className="max-w-2xl space-y-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
    >
      <FormError erro={estado?.erro} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Descrição da Taxa" name="descricao" required defaultValue={v("descricao")} />
        <CampoMoeda label="Valor" name="valor" required defaultValue={v("valor")} />
        <Campo label="Vencimento / Validade" name="vencimento" type="date" defaultValue={v("vencimento")} />
        <Campo label="Número (guia/DARF/GRU)" name="numero" defaultValue={v("numero")} />
        <CampoSelect
          label="Cliente (opcional)"
          name="clienteId"
          defaultValue={v("clienteId")}
          onChange={(e) => {
            setClienteSelecionado(e.target.value);
            setProcessoVinculado("");
          }}
          options={[
            { value: "", label: "—" },
            ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
          ]}
        />
        <CampoSelect
          label="Processo (opcional)"
          name="processoId"
          defaultValue={v("processoId")}
          onChange={(e) => setProcessoVinculado(e.target.value)}
          options={[
            { value: "", label: "—" },
            ...listaProcessos
              .filter((p) => !clienteSelecionado || p.clienteId === clienteSelecionado)
              .map((p) => ({ value: p.id, label: p.label })),
          ]}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
          Boleto/Taxa (PDF) — o sistema tenta reconhecer os dados automaticamente
        </span>
        <input
          name="arquivo"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processarArquivo(file);
          }}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        />
      </label>

      <div ref={marcadorRef}>
        {processando && (
          <p className="flex items-center gap-2 text-body-sm text-outline">
            <ScanLine size={14} /> Lendo documento... {progresso}%
          </p>
        )}
        {resultado === "ok" && (
          <p className="text-body-sm text-success">Dados reconhecidos — confira antes de salvar.</p>
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

        <label className="mt-2 flex w-fit items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-body-sm text-primary">
          <input
            type="checkbox"
            name="documentoPago"
            checked={documentoPago}
            onChange={(e) => setDocumentoPago(e.target.checked)}
          />
          O documento indica que a taxa já foi paga
        </label>
      </div>

      <SubmitButton>Registrar Taxa</SubmitButton>
    </form>
  );
}
