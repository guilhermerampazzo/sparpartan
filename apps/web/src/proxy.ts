import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { moduloLiberado } from "@/lib/permissoes";

const PUBLIC_PATHS = [
  "/login",
  "/assinar",
  "/portal/login",
  "/c",
  "/api/lms/arquivos",
  "/aluno",
];

export default auth((req) => {
  const isPublic = PUBLIC_PATHS.some((path) => req.nextUrl.pathname.startsWith(path));
  const isApiAuth =
    req.nextUrl.pathname.startsWith("/api/auth") ||
    req.nextUrl.pathname.startsWith("/api/auth-aluno");

  if (isApiAuth || isPublic) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const usuario = req.auth.user as
    | { role?: string; tipo?: string; modulosPermitidos?: string[] | null }
    | undefined;

  // Sessão do portal do cliente: só tem acesso às próprias rotas — /portal e
  // downloads de documentos/comprovantes (que checam posse na rota). Qualquer
  // outra rota (app da equipe, APIs internas) volta para o portal.
  if (usuario?.tipo === "cliente") {
    const caminho = req.nextUrl.pathname;
    const permitidoCliente =
      caminho.startsWith("/portal") ||
      caminho.startsWith("/api/documentos") ||
      /^\/api\/processos\/[^/]+\/comprovante/.test(caminho);
    if (!permitidoCliente) {
      return NextResponse.redirect(new URL("/portal", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  if (usuario?.tipo === "equipe") {
    if (usuario.role !== "admin") {
      const liberado = moduloLiberado(req.nextUrl.pathname, usuario.modulosPermitidos ?? null);
      if (!liberado) {
        const url = req.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("erro", "acesso-negado");
        return NextResponse.redirect(url);
      }
    }

    // Role "leitura" é somente-leitura: bloqueia qualquer Server Action
    // (POST com header Next-Action). O logout usa /api/auth/signout (form
    // comum, sem Next-Action) e continua funcionando.
    if (
      usuario.role === "leitura" &&
      req.method === "POST" &&
      req.headers.has("next-action")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("erro", "acesso-negado");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)"],
};
