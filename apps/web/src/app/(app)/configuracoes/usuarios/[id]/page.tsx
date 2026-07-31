import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { opcoesDeModulos } from "@/lib/permissoes";
import { BackButton, SubmitButton } from "@/components/ui";
import { atualizarModulosPermitidos } from "../actions";

export default async function EditarPermissoesUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") redirect("/");

  const { id } = await params;
  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
  if (!usuario) notFound();
  if (usuario.role === "admin") redirect("/configuracoes/usuarios");

  const opcoes = opcoesDeModulos();
  const acessoTotal = usuario.modulosPermitidos === null;
  const permitidos = new Set(usuario.modulosPermitidos ?? []);

  const salvar = atualizarModulosPermitidos.bind(null, usuario.id);

  return (
    <div className="max-w-2xl space-y-gutter">
      <BackButton href="/configuracoes/usuarios" />
      <div>
        <h1 className="font-display text-headline-lg font-bold text-primary">{usuario.nome}</h1>
        <p className="text-body-sm text-outline">{usuario.email}</p>
      </div>

      <form action={salvar} className="space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card">
        <label className="flex items-start gap-3 rounded-lg border border-outline-variant p-3">
          <input
            type="checkbox"
            name="acessoTotal"
            defaultChecked={acessoTotal}
            className="mt-0.5 h-4 w-4 accent-primary"
            id="acessoTotal"
          />
          <span>
            <span className="block text-body-md font-medium text-primary">Acesso total</span>
            <span className="block text-body-sm text-outline">
              O usuário enxerga todos os módulos do sistema, como um administrador.
            </span>
          </span>
        </label>

        <div>
          <p className="mb-2 text-label-sm font-medium uppercase tracking-wide text-outline">
            Módulos liberados (quando &quot;Acesso total&quot; estiver desmarcado)
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
                  defaultChecked={permitidos.has(opcao.href)}
                  className="h-4 w-4 accent-primary"
                />
                {opcao.label}
              </label>
            ))}
          </div>
        </div>

        <SubmitButton>Salvar permissões</SubmitButton>
      </form>
    </div>
  );
}
