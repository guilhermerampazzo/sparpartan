ALTER TABLE "loja_entregas" ADD COLUMN "endereco" text;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD COLUMN "transportadora" text;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD COLUMN "data_realizada" date;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD COLUMN "frete" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD COLUMN "pedagio" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD COLUMN "outros_custos" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD COLUMN "observacoes" text;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD COLUMN "criado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD COLUMN "atualizado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD COLUMN "atualizado_em" timestamp;--> statement-breakpoint
CREATE TABLE "loja_entrega_documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entrega_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"nome_original" text NOT NULL,
	"caminho" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"criado_por_id" uuid
);
--> statement-breakpoint
ALTER TABLE "loja_entrega_documentos" ADD CONSTRAINT "loja_entrega_documentos_entrega_id_loja_entregas_id_fk" FOREIGN KEY ("entrega_id") REFERENCES "public"."loja_entregas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_entrega_documentos" ADD CONSTRAINT "loja_entrega_documentos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD CONSTRAINT "loja_entregas_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD CONSTRAINT "loja_entregas_atualizado_por_id_usuarios_id_fk" FOREIGN KEY ("atualizado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "loja_entregas" SET "status" = 'aguardando' WHERE "status" = 'pendente';--> statement-breakpoint
UPDATE "loja_entregas" SET "status" = 'em_transporte' WHERE "status" = 'em_transito';