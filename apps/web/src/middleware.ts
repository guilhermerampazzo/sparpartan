import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { moduloLiberado } from "@/lib/permissoes";

export default auth((req) => {
  const usuario = req.auth?.user as
    | { role?: string; tipo?: string; modulosPermitidos?: string[] | null }
    | undefined;

  if (usuario?.tipo === "equipe" && usuario.role !== "admin") {
    const liberado = moduloLiberado(req.nextUrl.pathname, usuario.modulosPermitidos ?? null);
    if (!liberado) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("erro", "acesso-negado");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};
