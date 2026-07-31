ALTER TABLE "usuarios" ADD COLUMN "chat_ultima_leitura_em" timestamp;--> statement-breakpoint
ALTER TABLE "mensagens" DROP COLUMN "lida_em";