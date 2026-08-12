ALTER TYPE "public"."audit_acao" ADD VALUE 'arquivar' BEFORE 'login';--> statement-breakpoint
ALTER TYPE "public"."audit_acao" ADD VALUE 'alterar_status' BEFORE 'login';