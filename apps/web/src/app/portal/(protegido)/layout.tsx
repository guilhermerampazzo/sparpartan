import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session || (session.user as { tipo?: string })?.tipo !== "cliente") {
    redirect("/portal/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b border-outline-variant bg-surface-bright px-6">
        <p className="font-display text-lg font-bold text-primary">
          Sparapan — Portal do Cliente
        </p>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/portal/login" });
            }}
          >
            <button type="submit" className="text-sm text-outline hover:text-primary">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-gutter p-6">{children}</main>
    </div>
  );
}
