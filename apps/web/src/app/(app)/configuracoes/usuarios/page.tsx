import Link from "next/link";
import { UserCog, ShieldCheck, UserPlus, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { BackButton, EmptyState, DataTable, Badge, LinkButton, ConfirmButton, type Column } from "@/components/ui";
import { excluirUsuario } from "./actions";

type LinhaUsuario = typeof usuarios.$inferSelect;

export default async function UsuariosPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") redirect("/");

  const lista = await db.select().from(usuarios).orderBy(usuarios.nome);

  const columns: Column<LinhaUsuario>[] = [
    { header: "Nome", cell: (u) => <span className="font-medium text-primary">{u.nome}</span> },
    { header: "E-mail", cell: (u) => u.email },
    {
      header: "Perfil",
      cell: (u) => <Badge tone={u.role === "admin" ? "success" : "neutral"}>{u.role}</Badge>,
    },
    {
      header: "Acesso a módulos",
      cell: (u) =>
        u.role === "admin" || !u.modulosPermitidos ? (
          <span className="text-outline">Total</span>
        ) : (
          <span className="text-outline">{u.modulosPermitidos.length} liberado(s)</span>
        ),
    },
    {
      header: "",
      align: "right",
      cell: (u) =>
        u.role === "admin" ? (
          <span className="text-body-sm text-outline">—</span>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/configuracoes/usuarios/${u.id}`}
              className="inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
            >
              <UserCog size={14} />
              Permissões
            </Link>
            <form action={excluirUsuario.bind(null, u.id)}>
              <ConfirmButton
                mensagem={`Excluir o usuário "${u.nome}"? Ele perderá o acesso ao sistema.`}
                variant="text"
                icon={<Trash2 size={12} />}
              >
                Excluir
              </ConfirmButton>
            </form>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/configuracoes" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">Usuários</h1>
          <p className="max-w-2xl text-body-sm text-outline">
            Cadastre colaboradores, remova quem saiu e defina em quais módulos cada um pode
            acessar. Administradores sempre têm acesso total.
          </p>
        </div>
        <LinkButton href="/configuracoes/usuarios/novo" icon={UserPlus}>
          + Novo Usuário
        </LinkButton>
      </div>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(u) => u.id}
        empty={<EmptyState icon={ShieldCheck} title="Nenhum usuário cadastrado" />}
      />
    </div>
  );
}
