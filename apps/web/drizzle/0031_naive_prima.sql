-- Pipeline: novas etapas do funil comercial + campos novos nas oportunidades.
-- Nota: o Postgres 16 não suporta ALTER TYPE ... DROP VALUE (adicionado no 18),
-- então os labels antigos (atendimento, proposta_enviada, fechado, aguardando_cliente)
-- permanecem no enum sem uso — o código nunca os referencia.

-- 1) Novos valores do enum
ALTER TYPE "pipeline_estagio" ADD VALUE IF NOT EXISTS 'primeiro_contato';
ALTER TYPE "pipeline_estagio" ADD VALUE IF NOT EXISTS 'aguardando_documentacao';
ALTER TYPE "pipeline_estagio" ADD VALUE IF NOT EXISTS 'orcamento_enviado';
ALTER TYPE "pipeline_estagio" ADD VALUE IF NOT EXISTS 'aguardando_pagamento';
ALTER TYPE "pipeline_estagio" ADD VALUE IF NOT EXISTS 'servico_contratado';

-- 2) Migra os valores antigos para os novos (se houver dados)
UPDATE "pipeline_oportunidades" SET "estagio" = 'primeiro_contato' WHERE "estagio" = 'atendimento';
UPDATE "pipeline_oportunidades" SET "estagio" = 'orcamento_enviado' WHERE "estagio" = 'proposta_enviada';
UPDATE "pipeline_oportunidades" SET "estagio" = 'servico_contratado' WHERE "estagio" = 'fechado';
UPDATE "pipeline_oportunidades" SET "estagio" = 'aguardando_documentacao' WHERE "estagio" = 'aguardando_cliente';

UPDATE "pipeline_historico" SET "estagio_novo" = 'primeiro_contato' WHERE "estagio_novo" = 'atendimento';
UPDATE "pipeline_historico" SET "estagio_anterior" = 'primeiro_contato' WHERE "estagio_anterior" = 'atendimento';
UPDATE "pipeline_historico" SET "estagio_novo" = 'orcamento_enviado' WHERE "estagio_novo" = 'proposta_enviada';
UPDATE "pipeline_historico" SET "estagio_anterior" = 'orcamento_enviado' WHERE "estagio_anterior" = 'proposta_enviada';
UPDATE "pipeline_historico" SET "estagio_novo" = 'servico_contratado' WHERE "estagio_novo" = 'fechado';
UPDATE "pipeline_historico" SET "estagio_anterior" = 'servico_contratado' WHERE "estagio_anterior" = 'fechado';
UPDATE "pipeline_historico" SET "estagio_novo" = 'aguardando_documentacao' WHERE "estagio_novo" = 'aguardando_cliente';
UPDATE "pipeline_historico" SET "estagio_anterior" = 'aguardando_documentacao' WHERE "estagio_anterior" = 'aguardando_cliente';

-- 3) Novas colunas das oportunidades
ALTER TABLE "pipeline_oportunidades" ADD COLUMN IF NOT EXISTS "servico_solicitado" text;
ALTER TABLE "pipeline_oportunidades" ADD COLUMN IF NOT EXISTS "orcamento_id" uuid;
ALTER TABLE "pipeline_oportunidades" ADD COLUMN IF NOT EXISTS "responsavel_id" uuid;
ALTER TABLE "pipeline_oportunidades" ADD COLUMN IF NOT EXISTS "ultimo_contato_em" timestamp;
ALTER TABLE "pipeline_oportunidades" ADD COLUMN IF NOT EXISTS "proxima_acao" text;

ALTER TABLE "pipeline_oportunidades" ADD CONSTRAINT "pipeline_oportunidades_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "pipeline_oportunidades" ADD CONSTRAINT "pipeline_oportunidades_responsavel_id_usuarios_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
