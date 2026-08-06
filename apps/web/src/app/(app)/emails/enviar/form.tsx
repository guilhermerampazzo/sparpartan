"use client";

import { useActionState, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { enviarEmailCampanha } from "../actions";

export function EnviarEmailForm({
  listaClientes,
  listaTemplates,
}: {
  listaClientes: { id: string; nome: string; email: string | null }[];
  listaTemplates: { id: string; nome: string }[];
}) {
  const [estado, formAction] = useActionState(enviarEmailCampanha, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return listaClientes;
    return listaClientes.filter(
      (c) => c.nome.toLowerCase().includes(termo) || (c.email ?? "").toLowerCase().includes(termo)
    );
  }, [busca, listaClientes]);

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const comEmail = listaClientes.filter((c) => c.email).length;

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      <FormError erro={estado?.erro} />
      {estado?.resumo && (
        <div className="rounded-lg border border-success/40 bg-success-container px-4 py-3 text-body-sm text-on-success-container">
          {estado.resumo}
        </div>
      )}

      <SectionCard title="Campanha (envio em lote)">
        <p className="mb-4 text-body-sm text-outline">
          Escolha um template e selecione os clientes que devem recebê-lo. As variáveis{" "}
          <code className="font-mono text-xs">{"{{nome}}"}</code> e{" "}
          <code className="font-mono text-xs">{"{{email}}"}</code> são resolvidas individualmente.
          Clientes sem e-mail são ignorados automaticamente.
        </p>

        <div className="space-y-4">
          <CampoSelect
            label="Template"
            name="templateId"
            required
            defaultValue={v("templateId")}
            options={[
              { value: "", label: "Selecione..." },
              ...listaTemplates.map((t) => ({ value: t.id, label: t.nome })),
            ]}
          />

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                Clientes ({selecionados.size} selecionado(s) · {comEmail} com e-mail)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelecionados(new Set(filtrados.filter((c) => c.email).map((c) => c.id)))}
                  className="rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm text-primary hover:bg-surface-container-low"
                >
                  Selecionar visíveis
                </button>
                {selecionados.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelecionados(new Set())}
                    className="rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm text-outline hover:bg-surface-container-low"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="relative mb-2">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="w-full rounded-lg border border-outline-variant bg-surface py-2 pl-9 pr-3 text-sm text-primary outline-none focus:border-primary"
              />
            </div>

            <div className="max-h-80 overflow-y-auto rounded-lg border border-outline-variant">
              {filtrados.length === 0 ? (
                <p className="px-4 py-6 text-center text-body-sm text-outline">Nenhum cliente encontrado.</p>
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {filtrados.map((c) => {
                    const marcado = selecionados.has(c.id);
                    return (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low">
                          <input
                            type="checkbox"
                            name="clienteIds"
                            value={c.id}
                            checked={marcado}
                            onChange={() => alternar(c.id)}
                            className="size-4 shrink-0 accent-primary"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-md text-primary">{c.nome}</span>
                            {c.email && (
                              <span className="block truncate text-body-sm text-outline">{c.email}</span>
                            )}
                          </span>
                          {!c.email && (
                            <span className="shrink-0 text-body-sm text-danger">sem e-mail</span>
                          )}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SubmitButton>Enviar para {selecionados.size > 0 ? `${selecionados.size} cliente(s)` : "clientes selecionados"}</SubmitButton>
    </form>
  );
}
