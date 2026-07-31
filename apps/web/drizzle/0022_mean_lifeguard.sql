CREATE TABLE "contas_bancarias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"apelido" text NOT NULL,
	"banco" text,
	"agencia" text,
	"conta" text,
	"pix" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embarcacao_fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"embarcacao_id" uuid NOT NULL,
	"caminho" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orcamentos" ALTER COLUMN "servico_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "embarcacoes" ADD COLUMN "potencia_motor" numeric;--> statement-breakpoint
ALTER TABLE "embarcacoes" ADD COLUMN "numero_serie_motor" text;--> statement-breakpoint
ALTER TABLE "embarcacoes" ADD COLUMN "atividade_comercial" text;--> statement-breakpoint
ALTER TABLE "mensagens" ADD COLUMN "destinatario_id" uuid;--> statement-breakpoint
ALTER TABLE "mensagens" ADD COLUMN "anexo_caminho" text;--> statement-breakpoint
ALTER TABLE "mensagens" ADD COLUMN "anexo_nome" text;--> statement-breakpoint
ALTER TABLE "mensagens" ADD COLUMN "lida_em" timestamp;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD COLUMN "conta_bancaria_id" uuid;--> statement-breakpoint
ALTER TABLE "taxas_pagar" ADD COLUMN "numero" text;--> statement-breakpoint
ALTER TABLE "embarcacao_fotos" ADD CONSTRAINT "embarcacao_fotos_embarcacao_id_embarcacoes_id_fk" FOREIGN KEY ("embarcacao_id") REFERENCES "public"."embarcacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_destinatario_id_usuarios_id_fk" FOREIGN KEY ("destinatario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_conta_bancaria_id_contas_bancarias_id_fk" FOREIGN KEY ("conta_bancaria_id") REFERENCES "public"."contas_bancarias"("id") ON DELETE set null ON UPDATE no action;