"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const TEMPO_LIMITE_MS = 15 * 60 * 1000;
const EVENTOS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

export function SessionTimeout() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function reiniciarTimer() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, TEMPO_LIMITE_MS);
    }

    reiniciarTimer();
    EVENTOS.forEach((evento) => window.addEventListener(evento, reiniciarTimer, { passive: true }));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      EVENTOS.forEach((evento) => window.removeEventListener(evento, reiniciarTimer));
    };
  }, []);

  return null;
}
