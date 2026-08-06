"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Tema = "light" | "dark";

const TEMA_COOKIE = "tema";

type TemaContexto = {
  tema: Tema;
  alternarTema: () => void;
};

const Contexto = createContext<TemaContexto>({ tema: "light", alternarTema: () => {} });

/**
 * Gerencia o tema de forma síncrona com o React. O servidor já renderiza
 * `<html data-theme>` (do cookie em `lib/tema.ts`); este provider cuida de:
 * - aplicar a mudança no clique (atributo + localStorage + cookie);
 * - no primeiro mount, realinhar com o localStorage, cobrindo a hidratação
 *   (o React pode ter reescrito o atributo com o valor do servidor).
 */
export function ThemeProvider({
  children,
  temaInicial,
}: {
  children: ReactNode;
  temaInicial: Tema;
}) {
  const [tema, setTema] = useState<Tema>(temaInicial);

  const aplicar = useCallback((proximo: Tema) => {
    document.documentElement.setAttribute("data-theme", proximo);
    localStorage.setItem("theme", proximo);
    // Cookie não-httpOnly de propósito: o layout (server) o lê em toda
    // navegação para renderizar o `<html>` com o tema certo.
    document.cookie = `${TEMA_COOKIE}=${proximo};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  useEffect(() => {
    const armazenado = localStorage.getItem("theme");
    const alvo: Tema =
      armazenado === "dark" || armazenado === "light"
        ? armazenado
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    aplicar(alvo);
    setTema(alvo);
  }, [aplicar]);

  function alternarTema() {
    const proximo: Tema = tema === "dark" ? "light" : "dark";
    aplicar(proximo);
    setTema(proximo);
  }

  return <Contexto.Provider value={{ tema, alternarTema }}>{children}</Contexto.Provider>;
}

export function useTema() {
  return useContext(Contexto);
}
