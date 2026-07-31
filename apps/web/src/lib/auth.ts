import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios, clientes, auditLog } from "@/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 15 * 60, updateAge: 5 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "equipe",
      name: "Equipe",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const senha = credentials?.senha as string | undefined;
        if (!email || !senha) return null;

        const [usuario] = await db
          .select()
          .from(usuarios)
          .where(eq(usuarios.email, email))
          .limit(1);

        if (!usuario || !usuario.ativo) return null;

        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaValida) return null;

        await db.insert(auditLog).values({
          usuarioId: usuario.id,
          usuarioNome: usuario.nome,
          acao: "login",
          entidade: "usuario",
          entidadeId: usuario.id,
        });

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          tipo: "equipe",
          modulosPermitidos: usuario.modulosPermitidos ?? null,
        };
      },
    }),
    Credentials({
      id: "cliente",
      name: "Portal do Cliente",
      credentials: {
        cpfCnpj: { label: "CPF/CNPJ", type: "text" },
        senha: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const cpfCnpj = credentials?.cpfCnpj as string | undefined;
        const senha = credentials?.senha as string | undefined;
        if (!cpfCnpj || !senha) return null;

        const [cliente] = await db
          .select()
          .from(clientes)
          .where(eq(clientes.cpfCnpj, cpfCnpj))
          .limit(1);

        if (!cliente || !cliente.portalSenhaHash) return null;

        const senhaValida = await bcrypt.compare(senha, cliente.portalSenhaHash);
        if (!senhaValida) return null;

        return {
          id: cliente.id,
          name: cliente.nome,
          email: cliente.email,
          tipo: "cliente",
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.tipo = (user as { tipo?: string }).tipo;
        token.modulosPermitidos = (user as { modulosPermitidos?: string[] | null })
          .modulosPermitidos;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (
          session.user as {
            id?: string;
            role?: string;
            tipo?: string;
            modulosPermitidos?: string[] | null;
          }
        ).id = token.sub;
        (session.user as { role?: string; tipo?: string }).role = token.role as
          | string
          | undefined;
        (session.user as { role?: string; tipo?: string }).tipo = token.tipo as
          | string
          | undefined;
        (session.user as { modulosPermitidos?: string[] | null }).modulosPermitidos = token.modulosPermitidos as
          | string[]
          | null
          | undefined;
      }
      return session;
    },
  },
});
