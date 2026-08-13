"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-items";
import { itemNavLiberado } from "@/lib/permissoes";
import { Logo } from "@/components/logo";
import { ChatBadge } from "./chat-badge";
import { NavBadge, useContadoresNotificacao } from "./nav-notificacoes";

const CONTADOR_POR_HREF: Record<string, "lembretes" | "taxas" | "agenda" | "orcamentos"> = {
  "/pendencias": "lembretes",
  "/taxas": "taxas",
  "/agenda": "agenda",
  "/orcamentos": "orcamentos",
};

export function Sidebar({
  userName,
  userRole,
  modulosPermitidos,
}: {
  userName?: string | null;
  userRole?: string | null;
  modulosPermitidos?: string[] | null;
}) {
  const pathname = usePathname();
  const contadores = useContadoresNotificacao();

  const itensVisiveis =
    userRole === "admin"
      ? NAV_ITEMS
      : NAV_ITEMS.filter(
          (item) =>
            itemNavLiberado(item.href, modulosPermitidos) ||
            item.children?.some((filho) => itemNavLiberado(filho.href, modulosPermitidos))
        ).map((item) => ({
          ...item,
          children: item.children?.filter((filho) => itemNavLiberado(filho.href, modulosPermitidos)),
        }));

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col bg-nav lg:flex">
      <div className="flex justify-center px-6 py-6">
        <Logo size={72} className="object-contain" />
      </div>

      <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3">
        {itensVisiveis.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.href === "/chat") {
            return (
              <div key={item.href}>
                <Link
                  href="/chat"
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "border-r-2 border-nav-text bg-nav-text/15 font-bold text-nav-text"
                      : "text-nav-text/70 hover:bg-nav-text/10"
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  <span className="font-mono-caps text-[11px] uppercase tracking-wide">{item.label}</span>
                  <ChatBadge />
                </Link>
              </div>
            );
          }

          const contadorChave = CONTADOR_POR_HREF[item.href];
          const total = contadorChave ? contadores[contadorChave] : 0;

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border-r-2 border-nav-text bg-nav-text/15 font-bold text-nav-text"
                    : "text-nav-text/70 hover:bg-nav-text/10"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span className="font-mono-caps text-[11px] uppercase tracking-wide">
                  {item.label}
                </span>
                <NavBadge total={total} />
              </Link>
              {item.children && !item.esconderSubmenu && (
                <div className="ml-6 space-y-1 border-l border-nav-text/20 pl-2">
                  {item.children.map((sub) => {
                    const subActive = pathname.startsWith(sub.href);
                    const SubIcon = sub.icon;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          subActive
                            ? "bg-nav-text/15 font-bold text-nav-text"
                            : "text-nav-text/60 hover:bg-nav-text/10"
                        }`}
                      >
                        <SubIcon size={16} strokeWidth={subActive ? 2.5 : 2} />
                        <span className="font-mono-caps text-[11px] uppercase tracking-wide">
                          {sub.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-nav-text/20 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-pill bg-nav-text text-sm font-bold text-nav">
            {(userName ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-nav-text">
              {userName ?? "Usuário"}
            </p>
            <p className="truncate text-xs capitalize text-nav-text/70">
              {userRole ?? ""}
            </p>
          </div>
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-nav-text/80 hover:bg-nav-text/10"
          >
            <LogOut size={16} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
