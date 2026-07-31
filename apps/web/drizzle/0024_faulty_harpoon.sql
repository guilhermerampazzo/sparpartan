CREATE TYPE "public"."loja_categoria" AS ENUM('embarcacao', 'motor', 'equipamento_nautico', 'acessorio', 'pesca', 'servico');--> statement-breakpoint
CREATE TYPE "public"."loja_orcamento_status" AS ENUM('pendente', 'aprovado', 'recusado');--> statement-breakpoint
CREATE TYPE "public"."loja_venda_status" AS ENUM('em_andamento', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."pipeline_estagio" AS ENUM('novo_lead', 'atendimento', 'proposta_enviada', 'negociacao', 'fechado', 'em_execucao', 'aguardando_cliente', 'concluido', 'pos_venda', 'perdido');--> statement-breakpoint
CREATE TABLE "loja_entregas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venda_id" uuid NOT NULL,
	"cidade" text,
	"responsavel" text,
	"data_prevista" date,
	"status" text DEFAULT 'pendente' NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_fabricantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_fornecedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_orcamento_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orcamento_id" uuid NOT NULL,
	"produto_id" uuid,
	"descricao" text NOT NULL,
	"quantidade" integer DEFAULT 1 NOT NULL,
	"preco_unitario" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_orcamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"cliente_id" uuid NOT NULL,
	"valor_total" numeric DEFAULT '0' NOT NULL,
	"status" "loja_orcamento_status" DEFAULT 'pendente' NOT NULL,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loja_orcamentos_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "loja_produto_arquivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produto_id" uuid NOT NULL,
	"nome_original" text NOT NULL,
	"caminho" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_produto_fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produto_id" uuid NOT NULL,
	"caminho" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_produtos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria" "loja_categoria" NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"fabricante" text,
	"preco" numeric,
	"estoque" integer DEFAULT 0 NOT NULL,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_transportadoras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_venda_checklist_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venda_id" uuid NOT NULL,
	"descricao" text NOT NULL,
	"concluido" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_venda_documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venda_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"nome_original" text NOT NULL,
	"caminho" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_venda_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venda_id" uuid NOT NULL,
	"produto_id" uuid,
	"descricao" text NOT NULL,
	"quantidade" integer DEFAULT 1 NOT NULL,
	"preco_unitario" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_venda_pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venda_id" uuid NOT NULL,
	"valor" numeric NOT NULL,
	"forma_pagamento" text,
	"data_pagamento" date,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_vendas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orcamento_id" uuid,
	"cliente_id" uuid NOT NULL,
	"valor_total" numeric DEFAULT '0' NOT NULL,
	"custo_total" numeric,
	"comissao" numeric,
	"status" "loja_venda_status" DEFAULT 'em_andamento' NOT NULL,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_historico" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"oportunidade_id" uuid NOT NULL,
	"estagio_anterior" "pipeline_estagio",
	"estagio_novo" "pipeline_estagio" NOT NULL,
	"usuario_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_oportunidades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"cliente_id" uuid,
	"telefone_contato" text,
	"origem" text,
	"estagio" "pipeline_estagio" DEFAULT 'novo_lead' NOT NULL,
	"motivo_perda" text,
	"valor_estimado" numeric,
	"observacoes" text,
	"criado_por_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "arquivos" ADD COLUMN "texto_extraido" text;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "criado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "embarcacoes" ADD COLUMN "criado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "obras" ADD COLUMN "criado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD COLUMN "criado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "criado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "servicos_contratados" ADD COLUMN "criado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "taxas_pagar" ADD COLUMN "criado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "modulos_permitidos" jsonb;--> statement-breakpoint
ALTER TABLE "loja_entregas" ADD CONSTRAINT "loja_entregas_venda_id_loja_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."loja_vendas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_orcamento_itens" ADD CONSTRAINT "loja_orcamento_itens_orcamento_id_loja_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."loja_orcamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_orcamento_itens" ADD CONSTRAINT "loja_orcamento_itens_produto_id_loja_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."loja_produtos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_orcamentos" ADD CONSTRAINT "loja_orcamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_produto_arquivos" ADD CONSTRAINT "loja_produto_arquivos_produto_id_loja_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."loja_produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_produto_fotos" ADD CONSTRAINT "loja_produto_fotos_produto_id_loja_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."loja_produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_venda_checklist_itens" ADD CONSTRAINT "loja_venda_checklist_itens_venda_id_loja_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."loja_vendas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_venda_documentos" ADD CONSTRAINT "loja_venda_documentos_venda_id_loja_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."loja_vendas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_venda_itens" ADD CONSTRAINT "loja_venda_itens_venda_id_loja_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."loja_vendas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_venda_itens" ADD CONSTRAINT "loja_venda_itens_produto_id_loja_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."loja_produtos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_venda_pagamentos" ADD CONSTRAINT "loja_venda_pagamentos_venda_id_loja_vendas_id_fk" FOREIGN KEY ("venda_id") REFERENCES "public"."loja_vendas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_vendas" ADD CONSTRAINT "loja_vendas_orcamento_id_loja_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."loja_orcamentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_vendas" ADD CONSTRAINT "loja_vendas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_historico" ADD CONSTRAINT "pipeline_historico_oportunidade_id_pipeline_oportunidades_id_fk" FOREIGN KEY ("oportunidade_id") REFERENCES "public"."pipeline_oportunidades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_historico" ADD CONSTRAINT "pipeline_historico_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_oportunidades" ADD CONSTRAINT "pipeline_oportunidades_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_oportunidades" ADD CONSTRAINT "pipeline_oportunidades_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embarcacoes" ADD CONSTRAINT "embarcacoes_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processos" ADD CONSTRAINT "processos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos_contratados" ADD CONSTRAINT "servicos_contratados_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxas_pagar" ADD CONSTRAINT "taxas_pagar_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;