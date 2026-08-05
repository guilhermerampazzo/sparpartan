"use client";

import { useState } from "react";
import { Pencil, X, Check, Plus } from "lucide-react";
import { Button, ConfirmButton } from "@/components/ui";
import { adicionarArquivo, atualizarArquivo, excluirArquivo } from "./actions";

const TIPOS = ["RG", "CPF", "CNH", "CRLV", "Boleto", "Comprovante", "Outro"];

/** Formulário de upload direto na pasta do cliente. */
export function UploadArquivoCliente({ clienteId }: { clienteId: string }) {
  return (
    <form action={adicionarArquivo.bind(null, clienteId)} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="tipo" value="Outro" />
      <input
        name="arquivo"
        type="file"
        required
        className="w-44 rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-xs text-primary outline-none focus:border-primary"
      />
      <Button type="submit" variant="outlined" size="sm" icon={Plus}>
        Adicionar
      </Button>
    </form>
  );
}

/** Linha de arquivo com ações de visualizar/baixar/editar/excluir. */
export function LinhaArquivo({
  id,
  nomeOriginal,
  tipo,
  rotaApi,
  editavel = true,
}: {
  id: string;
  nomeOriginal: string;
  tipo: string;
  rotaApi: string;
  editavel?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(nomeOriginal);
  const [tipoEdit, setTipoEdit] = useState(tipo);

  if (editando) {
    return (
      <form
        action={async (formData) => {
          await atualizarArquivo(id, formData);
          setEditando(false);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input name="nomeOriginal" value={nome} onChange={(e) => setNome(e.target.value)} className="w-48 rounded-lg border border-outline-variant bg-surface px-2 py-1 text-xs text-primary" />
        <select name="tipo" value={tipoEdit} onChange={(e) => setTipoEdit(e.target.value)} className="rounded-lg border border-outline-variant bg-surface px-2 py-1 text-xs text-primary">
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" icon={Check}>
          Salvar
        </Button>
        <button type="button" onClick={() => setEditando(false)} className="rounded p-1 text-outline hover:bg-surface-container-low" aria-label="Cancelar">
          <X size={14} />
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-body-sm font-medium text-primary">{nomeOriginal}</span>
      <span className="text-body-sm text-outline">— {tipo}</span>
      <span className="flex items-center gap-2">
        <a
          href={`${rotaApi}${rotaApi.includes("?") ? "&" : "?"}inline=1`}
          target="_blank"
          rel="noreferrer"
          className="text-body-sm text-primary hover:underline"
        >
          Visualizar
        </a>
        <a href={rotaApi} className="text-body-sm text-primary hover:underline">
          Baixar
        </a>
        {editavel && (
          <>
            <button type="button" onClick={() => setEditando(true)} className="text-body-sm text-primary hover:underline" aria-label={`Editar ${nomeOriginal}`}>
              <Pencil size={12} />
            </button>
            <form action={excluirArquivo.bind(null, id)}>
              <ConfirmButton
                mensagem={`Excluir o arquivo "${nomeOriginal}"?`}
                variant="text"
                size="sm"
              >
                Excluir
              </ConfirmButton>
            </form>
          </>
        )}
      </span>
    </div>
  );
}
