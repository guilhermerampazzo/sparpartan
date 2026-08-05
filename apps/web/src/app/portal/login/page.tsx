import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

async function login(formData: FormData) {
  "use server";
  const cpfCnpj = formData.get("cpfCnpj") as string;
  const senha = formData.get("senha") as string;

  try {
    await signIn("cliente", { cpfCnpj, senha, redirectTo: "/portal" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/portal/login?erro=1");
    }
    throw error;
  }
}

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-md">
        <h1 className="font-display text-headline-md font-bold text-primary">Sparapan</h1>
        <p className="mb-6 text-sm text-on-surface-variant">Portal do Cliente</p>

        {params.erro && (
          <p className="mb-4 rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
            CPF/CNPJ ou senha inválidos.
          </p>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-on-surface">
              CPF/CNPJ
            </label>
            <input
              type="text"
              name="cpfCnpj"
              required
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-on-surface">Senha</label>
            <input
              type="password"
              name="senha"
              required
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary shadow-md hover:bg-primary-container active:scale-95"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
