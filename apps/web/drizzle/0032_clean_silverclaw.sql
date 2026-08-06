ALTER TYPE "public"."documento_status" ADD VALUE 'entregue' BEFORE 'vencido';--> statement-breakpoint
ALTER TYPE "public"."processo_status" ADD VALUE 'aguardando_retorno_marinha' BEFORE 'concluido';--> statement-breakpoint
ALTER TYPE "public"."taxa_status" ADD VALUE 'para_emissao' BEFORE 'pendente';--> statement-breakpoint
ALTER TABLE "despesas" ADD COLUMN "paga" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "despesas" ADD COLUMN "paga_em" timestamp;--> statement-breakpoint

-- Taxas sem boleto anexado ainda precisam ser emitidas (alimentação automática do indicador).
UPDATE "public"."taxas_pagar" SET "status" = 'para_emissao' WHERE "status" = 'pendente' AND "arquivo_caminho" IS NULL;