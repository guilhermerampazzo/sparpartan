CREATE TABLE "obra_fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obra_id" uuid NOT NULL,
	"caminho" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documentos_gerados" ADD COLUMN "obra_id" uuid;--> statement-breakpoint
ALTER TABLE "mensagens" ADD COLUMN "editada_em" timestamp;--> statement-breakpoint
ALTER TABLE "mensagens" ADD COLUMN "apagada_em" timestamp;--> statement-breakpoint
ALTER TABLE "modelos_documento" ADD COLUMN "padrao_para_obra" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "obras" ADD COLUMN "endereco" text;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "obra_id" uuid;--> statement-breakpoint
ALTER TABLE "obra_fotos" ADD CONSTRAINT "obra_fotos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processos" ADD CONSTRAINT "processos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE set null ON UPDATE no action;