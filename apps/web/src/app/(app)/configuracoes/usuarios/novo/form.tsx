"use client";

import { useActionState, useState } from "react";
import { Campo, CampoSelect } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { criarUsuario } from "../actions";

export function NovoUsuarioForm({
  opcoes,
}: {
  opcoes: { href: string; label: string }[];
}) {
  const [estado, formAction] = useActionState(criarUsuario, null);
  const [role, setRole] = useState("operador");
  const [acessoTotal, setAcessoTotal] = useState(false);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  const mostrarModulos = role !== "admin" && !acessoTotal;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError erro={estado?.erro} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nome" name="nome" required defaultValue={v("nome")} />
        <Campo label="E-mail" name="email" type="email" required defaultValue={v("email")} />
        <Campo label="Senha" name="senha" type="password" required defaultValue={v("senha")} />
        <CampoSelect
          label="Perfil"
          name="role"
          required
          defaultValue={String(v("role") || "operador")}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { value: "admin", label: "Admin — acesso total" },
            { value: "operador", label: "Operador — pode editar" },
            { value: "leitura", label: "Leitura — só visualiza" },
          ]}
        />
      </div>

      <div className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
        <label className="flex items-start gap-3 rounded-lg border border-outline-variant p-3">
          <input
            type="checkbox"
            name="acessoTotal"
            checked={acessoTotal}
            onChange={(e) => setAcessoTotal(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>
            <span className="block text-body-md font-medium text-primary">Acesso total</span>
            <span className="block text-body-sm text-outline">
              O usuário enxerga todos os módulos do sistema, como um administrador.
            </span>
          </span>
        </label>

        {mostrarModulos && (
          <div>
            <p className="mb-2 text-label-sm font-medium uppercase tracking-wide text-outline">
              Áreas que este usuário poderá acessar
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {opcoes.map((opcao) => (
                <label
                  key={opcao.href}
                  className="flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-body-sm"
                >
                  <input
                    type="checkbox"
                    name="modulos"
                    value={opcao.href}
                    className="h-4 w-4 accent-primary"
                  />
                  {opcao.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <SubmitButton>Criar Usuário</SubmitButton>
    </form>
  );
}
