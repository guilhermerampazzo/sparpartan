"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav-items";
import { itemNavLiberado } from "@/lib/permissoes";
import { ChatPopover } from "./chat-popover";
import { NavBadge, useContadoresNotificacao } from "./nav-notificacoes";

const CONTADOR_POR_HREF: Record<string, "lembretes" | "taxas" | "agenda" | "orcamentos"> = {
  "/lembretes": "lembretes",
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
      : NAV_ITEMS.filter((item) => itemNavLiberado(item.href, modulosPermitidos)).map((item) => ({
          ...item,
          children: item.children?.filter((filho) => itemNavLiberado(filho.href, modulosPermitidos)),
        }));

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col bg-primary lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <Image src="/logo.svg" alt="Sparapan" width={64} height={64} className="h-16 w-16 object-contain" />
        <div>
          <p className="font-display text-base font-bold leading-tight text-on-primary">
            Sparapan
          </p>
          <p className="font-mono-caps text-[10px] uppercase tracking-wide text-on-primary/70">
            Nautical Management
          </p>
        </div>
      </div>

      <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3">
        {itensVisiveis.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.href === "/chat") {
            return (
              <div key={item.href}>
                <ChatPopover />
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
                    ? "border-r-2 border-on-primary bg-on-primary/15 font-bold text-on-primary"
                    : "text-on-primary/70 hover:bg-on-primary/10"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                <span className="font-mono-caps text-[11px] uppercase tracking-wide">
                  {item.label}
                </span>
                <NavBadge total={total} />
              </Link>
              {item.children && (
                <div className="ml-6 space-y-1 border-l border-on-primary/20 pl-2">
                  {item.children.map((sub) => {
                    const subActive = pathname.startsWith(sub.href);
                    const SubIcon = sub.icon;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          subActive
                            ? "bg-on-primary/15 font-bold text-on-primary"
                            : "text-on-primary/60 hover:bg-on-primary/10"
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

      <div className="border-t border-on-primary/20 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-pill bg-on-primary text-sm font-bold text-primary">
            {(userName ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-on-primary">
              {userName ?? "Usuário"}
            </p>
            <p className="truncate text-xs capitalize text-on-primary/70">
              {userRole ?? ""}
            </p>
          </div>
        </div>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-primary/80 hover:bg-on-primary/10"
          >
            <LogOut size={16} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
