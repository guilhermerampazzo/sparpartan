"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { Button, Badge } from "@/components/ui";
import { atualizarStatusProcesso } from "../../processos/actions";

const STATUS_OPCOES: { valor: string; label: string; tone: "info" | "warning" | "success" | "danger" | "neutral" }[] = [
  { valor: "aberto", label: "Aberto", tone: "info" },
  { valor: "documentos_pendentes", label: "Aguardando Documentos", tone: "warning" },
  { valor: "pronto_para_protocolo", label: "Pronto p/ Protocolo", tone: "info" },
  { valor: "protocolado", label: "Protocolado", tone: "info" },
  { valor: "concluido", label: "Serviço Concluído", tone: "success" },
  { valor: "cancelado", label: "Cancelado", tone: "danger" },
];

export type AtendimentoDados = {
  id: string;
  status: string;
  servicoNome: string;
  embarcacaoNome: string | null;
  numeroProtocolo: string | null;
  dataProtocolo: string | null;
  criadoEm: Date;
  diasProtocolo: number | null;
};

export function AtendimentoCard({ processo }: { processo: AtendimentoDados }) {
  const [status, setStatus] = useState(processo.status);

  const opcao = STATUS_OPCOES.find((o) => o.valor === status) ?? STATUS_OPCOES[0];
  const diasProtocolo = processo.diasProtocolo;

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-primary">{processo.servicoNome}</p>
          <p className="text-body-sm text-outline">
            {processo.embarcacaoNome ?? "Sem embarcação"}
            {" — "}
            {new Date(processo.criadoEm).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Badge tone={opcao.tone} size="sm">
          {opcao.label}
        </Badge>
      </div>

      {status === "protocolado" && diasProtocolo !== null && (
        <p className="mt-2 text-body-sm text-outline">
          Prazo do protocolo (60 dias):{" "}
          <span className={diasProtocolo <= 10 ? "font-semibold text-danger" : "font-semibold text-primary"}>
            {diasProtocolo} dia(s) restante(s)
          </span>
        </p>
      )}

      <form action={atualizarStatusProcesso.bind(null, processo.id)} className="mt-3 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
              Status do atendimento
            </span>
            <select
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
            >
              {STATUS_OPCOES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {status === "protocolado" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                  Nº do protocolo *
                </span>
                <input
                  name="numeroProtocolo"
                  defaultValue={processo.numeroProtocolo ?? ""}
                  required
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                  Data do protocolo
                </span>
                <input
                  name="dataProtocolo"
                  type="date"
                  defaultValue={processo.dataProtocolo ?? ""}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                  Scan do protocolo
                </span>
                <input
                  name="comprovante"
                  type="file"
                  accept="image/*,.pdf"
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                />
              </label>
            </>
          )}

          {status === "concluido" && (
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                Vencimento do documento
              </span>
              <input
                name="vencimentoDocumento"
                type="date"
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              />
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm">
            Salvar Status
          </Button>
          <Link
            href={`/processos/${processo.id}`}
            className="inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
          >
            Abrir processo <ArrowRight size={12} />
          </Link>
          <Link
            href={`/documentos/gerar?processoId=${processo.id}`}
            className="inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
          >
            <FileText size={12} /> Gerar documento
          </Link>
        </div>
      </form>
    </div>
  );
}
