import Image from "next/image";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { SessionTimeout } from "@/components/layout/session-timeout";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const usuarioSessao = session?.user as
    | { role?: string; modulosPermitidos?: string[] | null }
    | undefined;

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar
        userName={session?.user?.name}
        userRole={usuarioSessao?.role}
        modulosPermitidos={usuarioSessao?.modulosPermitidos ?? null}
      />
      <header className="fixed left-0 right-0 top-0 z-10 flex h-16 items-center justify-between border-b border-outline-variant bg-surface-bright px-4 lg:left-64">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Sparapan" width={28} height={28} className="lg:hidden" />
          <p className="font-display text-lg font-bold text-primary">Sparapan Solução Naval</p>
        </div>
        <ThemeToggle />
      </header>
      <main className="px-margin-mobile pb-24 pt-20 lg:ml-64 lg:px-margin-desktop lg:pb-margin-desktop">
        <div className="mx-auto max-w-[1440px] space-y-gutter">{children}</div>
      </main>
      <BottomNav />
      <GlobalSearch />
      <SessionTimeout />
    </div>
  );
}
