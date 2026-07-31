import Link from "next/link";
import { UserCog, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { BackButton, EmptyState, DataTable, Badge, type Column } from "@/components/ui";

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
          <Link
            href={`/configuracoes/usuarios/${u.id}`}
            className="inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline"
          >
            <UserCog size={14} />
            Permissões
          </Link>
        ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/configuracoes" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Usuários</h1>
      <p className="max-w-2xl text-body-sm text-outline">
        Defina quais módulos cada colaborador pode acessar. Administradores sempre têm acesso
        total e não aparecem para edição aqui.
      </p>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(u) => u.id}
        empty={<EmptyState icon={ShieldCheck} title="Nenhum usuário cadastrado" />}
      />
    </div>
  );
}
