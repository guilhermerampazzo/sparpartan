import { and, asc, eq, isNull, or } from "drizzle-orm";
import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { mensagens, usuarios } from "@/db/schema";
import { auth } from "@/lib/auth";
import { Button, EmptyState, BackButton } from "@/components/ui";
import { enviarMensagem, marcarChatComoLido } from "./actions";
import { MensagemItem } from "./mensagem-item";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ com?: string; erro?: string }>;
}) {
  const { com, erro } = await searchParams;
  const session = await auth();
  const meuId = (session?.user as { id?: string } | undefined)?.id;

  const usuariosEquipe = await db
    .select({ id: usuarios.id, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(asc(usuarios.nome));

  const contato = com ? usuariosEquipe.find((u) => u.id === com) : undefined;

  const condicao = contato && meuId
    ? or(
        and(eq(mensagens.usuarioId, meuId), eq(mensagens.destinatarioId, contato.id)),
        and(eq(mensagens.usuarioId, contato.id), eq(mensagens.destinatarioId, meuId))
      )
    : isNull(mensagens.destinatarioId);

  const lista = await db
    .select()
    .from(mensagens)
    .where(condicao)
    .orderBy(asc(mensagens.criadoEm))
    .limit(200);

  await marcarChatComoLido();

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <aside className="hidden w-56 shrink-0 flex-col overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-3 md:flex">
        <p className="mb-2 font-mono-caps text-[10px] uppercase tracking-wide text-outline">Conversas</p>
        <Link
          href="/chat"
          className={`rounded-lg px-3 py-2 text-body-sm ${
            !contato ? "bg-primary/10 font-medium text-primary" : "text-outline hover:bg-surface-container"
          }`}
        >
          Equipe (geral)
        </Link>
        <p className="mb-1 mt-4 font-mono-caps text-[10px] uppercase tracking-wide text-outline">
          Conversa privada
        </p>
        {usuariosEquipe
          .filter((u) => u.id !== meuId)
          .map((u) => (
            <Link
              key={u.id}
              href={`/chat?com=${u.id}`}
              className={`rounded-lg px-3 py-2 text-body-sm ${
                contato?.id === u.id ? "bg-primary/10 font-medium text-primary" : "text-outline hover:bg-surface-container"
              }`}
            >
              {u.nome}
            </Link>
          ))}
      </aside>

      <div className="flex flex-1 flex-col space-y-gutter">
        <div>
          <BackButton href="/" />
          <h1 className="font-display text-headline-lg font-bold text-primary">
            {contato ? `Conversa com ${contato.nome}` : "Chat da Equipe"}
          </h1>
          <p className="text-body-sm text-outline">
            {contato
              ? "Mensagem privada — visível somente para vocês dois."
              : "Canal geral da equipe. Atualiza ao enviar — recarregue para ver mensagens novas de outras pessoas."}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          {erro && (
            <div className="mb-4 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">
              {erro}
            </div>
          )}
          {lista.length === 0 ? (
            <EmptyState icon={MessageSquare} title="Nenhuma mensagem ainda — comece a conversa" />
          ) : (
            <ul className="space-y-3">
              {lista.map((m) => (
                <MensagemItem key={m.id} mensagem={m} minha={m.usuarioId === meuId} />
              ))}
            </ul>
          )}
        </div>

        <form action={enviarMensagem} className="flex flex-col gap-2 sm:flex-row sm:items-end" encType="multipart/form-data">
          <input type="hidden" name="destinatarioId" value={contato?.id ?? ""} />
          <textarea
            name="corpo"
            rows={2}
            placeholder="Escreva uma mensagem..."
            className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <input
              type="file"
              name="anexo"
              className="w-40 text-body-sm text-outline file:mr-2 file:rounded-md file:border-0 file:bg-surface-container file:px-2 file:py-1 file:text-body-sm"
            />
            <Button type="submit">Enviar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
