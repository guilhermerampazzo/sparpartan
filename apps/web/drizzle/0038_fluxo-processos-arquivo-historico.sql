ALTER TYPE "public"."processo_status" ADD VALUE 'processo_preenchido';--> statement-breakpoint
ALTER TYPE "public"."processo_status" ADD VALUE 'processo_assinado';--> statement-breakpoint
ALTER TYPE "public"."processo_status" ADD VALUE 'aguardando_pagamento';--> statement-breakpoint
CREATE TABLE "arquivo_alteracoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arquivo_id" uuid NOT NULL,
	"usuario_id" uuid,
	"acao" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "arquivos" ADD COLUMN "criado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "arquivos" ADD COLUMN "atualizado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "arquivos" ADD COLUMN "atualizado_em" timestamp;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "exigencia_observacao" text;--> statement-breakpoint
ALTER TABLE "arquivo_alteracoes" ADD CONSTRAINT "arquivo_alteracoes_arquivo_id_arquivos_id_fk" FOREIGN KEY ("arquivo_id") REFERENCES "public"."arquivos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arquivo_alteracoes" ADD CONSTRAINT "arquivo_alteracoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arquivos" ADD CONSTRAINT "arquivos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "arquivos" ADD CONSTRAINT "arquivos_atualizado_por_id_usuarios_id_fk" FOREIGN KEY ("atualizado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
-- Migração dos status antigos para o novo fluxo padrão
UPDATE "processos" SET "status" = 'processo_preenchido' WHERE "status" = 'documentos_pendentes';
UPDATE "processos" SET "status" = 'processo_assinado' WHERE "status" = 'pronto_para_protocolo';
UPDATE "processos" SET "status" = 'protocolado' WHERE "status" = 'aguardando_retorno_marinha';
