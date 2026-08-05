import { redirect } from "next/navigation";
import Link from "next/link";
import { authAluno, signOutAluno } from "@/lib/auth-aluno";

async function logout() {
  "use server";
  await signOutAluno({ redirectTo: "/aluno/login" });
}

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const session = await authAluno();

  if (!session?.user) {
    redirect("/aluno/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-6 py-4">
        <Link href="/aluno" className="font-display text-title-lg font-bold text-primary hover:opacity-80">
          Área do Aluno
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
          >
            Sair
          </button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
