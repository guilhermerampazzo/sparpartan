"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { adicionarArquivoEmbarcacaoSparapan } from "../../actions";

/** Upload de arquivo na pasta da embarcação (documento, seguro, foto ou outro). */
export function UploadArquivoEmbarcacaoSparapan({ embarcacaoId }: { embarcacaoId: string }) {
  return (
    <form
      action={adicionarArquivoEmbarcacaoSparapan.bind(null, embarcacaoId)}
      className="flex flex-wrap items-end gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"
    >
      <div className="flex flex-col gap-1">
        <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Tipo</span>
        <select
          name="tipo"
          defaultValue="documento"
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        >
          <option value="documento">Documento</option>
          <option value="seguro">Seguro obrigatório</option>
          <option value="foto">Foto</option>
          <option value="outro">Outro</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Título</span>
        <input
          name="titulo"
          placeholder="Ex.: Seguro 2026, Foto de popa..."
          className="w-56 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Arquivo</span>
        <input
          name="arquivo"
          type="file"
          required
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        />
      </div>
      <Button type="submit" variant="outlined" size="sm" icon={Plus}>
        Adicionar
      </Button>
    </form>
  );
}
