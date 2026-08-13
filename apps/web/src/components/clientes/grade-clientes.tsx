"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Users, Trash2, Phone, Mail, MapPin } from "lucide-react";
import { Badge, ConfirmButton, EmptyState } from "@/components/ui";
import { statusProcesso } from "@/lib/status";
import type { ResumoCliente } from "@/lib/clientes";
import { excluirCliente } from "@/app/(app)/clientes/actions";

const CLASSIFICACAO_LABEL: Record<string, string> = {
  cliente: "Cliente",
  aluno: "Aluno",
  ambos: "Cliente e Aluno",
};

export function GradeClientes({ clientes }: { clientes: ResumoCliente[] }) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return clientes.filter((c) => {
      if (tipo && c.classificacao !== tipo) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        c.cpfCnpj.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [clientes, busca, tipo]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, CPF ou e-mail..."
          className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="w-44 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
        >
          <option value="">Todos</option>
          <option value="cliente">Cliente</option>
          <option value="aluno">Aluno</option>
          <option value="ambos">Cliente e Aluno</option>
        </select>
        <span className="text-body-sm text-outline">
          {filtrados.length} de {clientes.length}
        </span>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          icon={Users}
          title={busca || tipo ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}
          action={
            busca || tipo
              ? undefined
              : { label: "+ Novo Cliente", href: "/clientes/novo" }
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((c) => <CartaoCliente key={c.id} cliente={c} />)}
        </div>
      )}
    </div>
  );
}

function CartaoCliente({ cliente: c }: { cliente: ResumoCliente }) {
  const telefone = c.celular ?? c.telefone;
  const local = [c.cidade, c.uf].filter(Boolean).join(" - ");
  const status = c.statusProcesso ? statusProcesso(c.statusProcesso) : null;

  return (
    <Link
      href={`/clientes/${c.id}`}
      className="group relative flex flex-col gap-1 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 transition-colors hover:border-primary/50 hover:bg-surface-container"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate font-medium text-primary">{c.nome}</p>
        <Badge tone={c.classificacao === "ambos" ? "info" : "neutral"} size="sm">
          {CLASSIFICACAO_LABEL[c.classificacao] ?? c.classificacao}
        </Badge>
      </div>
      <p className="text-body-sm text-outline">{c.cpfCnpj}</p>
      {telefone && (
        <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
          <Phone size={12} /> {telefone}
        </p>
      )}
      {c.email && (
        <p className="flex min-w-0 items-center gap-1 truncate text-body-sm text-on-surface-variant">
          <Mail size={12} /> {c.email}
        </p>
      )}
      {local && (
        <p className="flex items-center gap-1 text-body-sm text-outline">
          <MapPin size={12} /> {local}
        </p>
      )}
      {c.servicoProcesso && status && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-outline-variant/60 pt-2">
          <span className="truncate text-body-sm font-medium">{c.servicoProcesso}</span>
          <Badge tone={status.tone} size="sm">
            {status.label}
          </Badge>
        </div>
      )}
      <span className="absolute right-2 top-1/2 hidden -translate-y-1/2 group-hover:block">
        <ExcluirInline cliente={c} />
      </span>
    </Link>
  );
}

function ExcluirInline({ cliente: c }: { cliente: ResumoCliente }) {
  const excluirComId = excluirCliente.bind(null, c.id);
  return (
    <form action={excluirComId} onClick={(e) => e.stopPropagation()}>
      <ConfirmButton
        mensagem={`Excluir ${c.nome}? Vai para a lixeira, dá para restaurar depois.`}
        variant="text"
        icon={<Trash2 size={12} />}
      >
        Excluir
      </ConfirmButton>
    </form>
  );
}
