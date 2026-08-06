import { db } from "@/db";
import { mensagens } from "@/db/schema";

/**
 * Registra um aviso automático no canal geral do Chat da Equipe (mensagem do
 * "Sistema"). A ideia do chat não é substituir o WhatsApp — é a comunicação
 * interna relacionada ao sistema: documento gerado, processo protocolado,
 * orçamento criado etc., sem ninguém precisar digitar.
 */
export async function registrarNoChat(texto: string) {
  await db.insert(mensagens).values({
    usuarioNome: "Sistema",
    corpo: texto,
  });
}
