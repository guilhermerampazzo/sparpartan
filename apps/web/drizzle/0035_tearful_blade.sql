CREATE TYPE "public"."evento_interno_status" AS ENUM('pendente', 'em_andamento', 'concluido', 'arquivado');--> statement-breakpoint
CREATE TABLE "agendamento_processos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agendamento_id" uuid NOT NULL,
	"processo_id" uuid NOT NULL,
	"ordem" smallint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evento_vinculos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"data" date NOT NULL,
	"prazo_solucao" date,
	"responsavel_id" uuid,
	"status" "evento_interno_status" DEFAULT 'pendente' NOT NULL,
	"observacoes" text,
	"criado_por_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	"concluido_em" timestamp,
	"arquivado_em" timestamp
);
--> statement-breakpoint
CREATE TABLE "representantes_legais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"cpf" text,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agenda_eventos" ADD COLUMN "servico_id" uuid;--> statement-breakpoint
ALTER TABLE "agenda_eventos" ADD COLUMN "representante_legal_id" uuid;--> statement-breakpoint
ALTER TABLE "agenda_eventos" ADD COLUMN "atualizado_em" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "agenda_interessados" ADD COLUMN "observacao" text;--> statement-breakpoint
ALTER TABLE "agendamento_processos" ADD CONSTRAINT "agendamento_processos_agendamento_id_agenda_eventos_id_fk" FOREIGN KEY ("agendamento_id") REFERENCES "public"."agenda_eventos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agendamento_processos" ADD CONSTRAINT "agendamento_processos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento_vinculos" ADD CONSTRAINT "evento_vinculos_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_responsavel_id_usuarios_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agendamento_processos_agendamento_processo_uq" ON "agendamento_processos" USING btree ("agendamento_id","processo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evento_vinculos_evento_entidade_uq" ON "evento_vinculos" USING btree ("evento_id","entidade","entidade_id");--> statement-breakpoint
ALTER TABLE "agenda_eventos" ADD CONSTRAINT "agenda_eventos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_eventos" ADD CONSTRAINT "agenda_eventos_representante_legal_id_representantes_legais_id_fk" FOREIGN KEY ("representante_legal_id") REFERENCES "public"."representantes_legais"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Backfill: textos antigos de representante legal viram registros no cadastro novo.
INSERT INTO "representantes_legais" ("nome", "observacoes")
SELECT DISTINCT "representante_legal", 'Migrado do texto antigo do agendamento'
FROM "agenda_eventos"
WHERE "representante_legal" IS NOT NULL AND btrim("representante_legal") <> '';
--> statement-breakpoint
UPDATE "agenda_eventos" e
SET "representante_legal_id" = r."id"
FROM "representantes_legais" r
WHERE e."representante_legal" = r."nome" AND e."representante_legal" IS NOT NULL;