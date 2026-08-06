"use client";

import { Moon, Sun } from "lucide-react";
import { useTema } from "./theme-provider";

export function ThemeToggle() {
  const { tema, alternarTema } = useTema();
  const dark = tema === "dark";

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className="rounded-pill p-2 text-on-surface-variant hover:bg-surface-container-low"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
