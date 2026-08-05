CREATE TYPE "public"."pendencia_categoria" AS ENUM('clientes', 'embarcacoes', 'processos', 'financeiro', 'loja', 'escola', 'empresa', 'pessoal');--> statement-breakpoint
CREATE TYPE "public"."pendencia_prioridade" AS ENUM('alta', 'media', 'baixa');--> statement-breakpoint
CREATE TYPE "public"."pendencia_status" AS ENUM('pendente', 'concluida', 'arquivada');--> statement-breakpoint
CREATE TABLE "pendencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"descricao" text NOT NULL,
	"categoria" "pendencia_categoria" DEFAULT 'processos' NOT NULL,
	"prioridade" "pendencia_prioridade" DEFAULT 'media' NOT NULL,
	"status" "pendencia_status" DEFAULT 'pendente' NOT NULL,
	"data" date NOT NULL,
	"horario" text,
	"cliente_id" uuid,
	"embarcacao_id" uuid,
	"processo_id" uuid,
	"responsavel" text,
	"responsavel_id" uuid,
	"observacoes" text,
	"origem" text DEFAULT 'manual' NOT NULL,
	"privada" boolean DEFAULT false NOT NULL,
	"criado_por_id" uuid,
	"concluido_por_id" uuid,
	"concluida_em" timestamp,
	"arquivada_em" timestamp,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_embarcacao_id_embarcacoes_id_fk" FOREIGN KEY ("embarcacao_id") REFERENCES "public"."embarcacoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_responsavel_id_usuarios_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_concluido_por_id_usuarios_id_fk" FOREIGN KEY ("concluido_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;