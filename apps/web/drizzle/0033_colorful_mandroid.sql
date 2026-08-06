CREATE TYPE "public"."certificado_status" AS ENUM('para_emitir', 'emitido');--> statement-breakpoint
CREATE TYPE "public"."documento_obra_status" AS ENUM('pendente', 'emitido');--> statement-breakpoint
CREATE TYPE "public"."documento_obra_tipo" AS ENUM('laudo', 'art');--> statement-breakpoint
CREATE TYPE "public"."obra_status" AS ENUM('em_projeto', 'em_execucao', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."turma_status" AS ENUM('aberta', 'concluida', 'cancelada');--> statement-breakpoint
ALTER TYPE "public"."evento_tipo" ADD VALUE 'vistoria' BEFORE 'vencimento';--> statement-breakpoint
CREATE TABLE "certificados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aluno_id" uuid NOT NULL,
	"materia_id" uuid,
	"prova_id" uuid,
	"tentativa_id" uuid,
	"status" "certificado_status" DEFAULT 'para_emitir' NOT NULL,
	"emitido_em" timestamp,
	"arquivo_caminho" text,
	"origem" text DEFAULT 'manual' NOT NULL,
	"criado_por_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "obras_documentos_tecnicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obra_id" uuid NOT NULL,
	"tipo" "documento_obra_tipo" NOT NULL,
	"descricao" text NOT NULL,
	"status" "documento_obra_status" DEFAULT 'pendente' NOT NULL,
	"arquivo_caminho" text,
	"criado_por_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turmas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"status" "turma_status" DEFAULT 'aberta' NOT NULL,
	"inicio_em" date,
	"observacoes" text,
	"criado_por_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "obras" ADD COLUMN "status" "obra_status" DEFAULT 'em_projeto' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_aluno_id_alunos_id_fk" FOREIGN KEY ("aluno_id") REFERENCES "public"."alunos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_materia_id_materias_id_fk" FOREIGN KEY ("materia_id") REFERENCES "public"."materias"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_prova_id_provas_id_fk" FOREIGN KEY ("prova_id") REFERENCES "public"."provas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_tentativa_id_tentativas_prova_id_fk" FOREIGN KEY ("tentativa_id") REFERENCES "public"."tentativas_prova"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras_documentos_tecnicos" ADD CONSTRAINT "obras_documentos_tecnicos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras_documentos_tecnicos" ADD CONSTRAINT "obras_documentos_tecnicos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;