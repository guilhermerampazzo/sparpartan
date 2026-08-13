CREATE TYPE "public"."empresa_alerta_tipo" AS ENUM('vencimento_proximo', 'vencimento_urgente', 'vencido', 'manutencao_proxima');--> statement-breakpoint
CREATE TYPE "public"."empresa_status" AS ENUM('ativa', 'inativa');--> statement-breakpoint
CREATE TYPE "public"."loja_compra_status" AS ENUM('rascunho', 'aguardando_envio', 'pedido_enviado', 'aguardando_fornecedor', 'confirmado', 'em_transporte', 'recebido', 'finalizado', 'cancelado');--> statement-breakpoint
CREATE TABLE "embarcacao_sparapan_arquivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"embarcacao_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"caminho" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "embarcacoes_sparapan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"numero_inscricao" text,
	"tipo" text,
	"atividade" text,
	"ano_fabricacao" text,
	"motor" text,
	"numero_serie" text,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa_alertas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"documento_id" uuid,
	"manutencao_id" uuid,
	"tipo" "empresa_alerta_tipo" NOT NULL,
	"mensagem" text NOT NULL,
	"resolvido" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa_documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"embarcacao_id" uuid,
	"tipo" text NOT NULL,
	"titulo" text,
	"numero" text,
	"data_emissao" date,
	"data_vencimento" date,
	"observacoes" text,
	"caminho" text,
	"regularizado" boolean DEFAULT false NOT NULL,
	"substituido_por_id" uuid,
	"criado_por_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa_embarcacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"numero_inscricao" text,
	"tipo" text,
	"atividade" text,
	"ano_fabricacao" text,
	"motor" text,
	"numero_serie" text,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa_manutencoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"embarcacao_id" uuid,
	"tipo" text NOT NULL,
	"descricao" text,
	"data_realizada" date,
	"horimetro" text,
	"proxima_manutencao" date,
	"proxima_troca_oleo" date,
	"oleo_utilizado" text,
	"responsavel" text,
	"observacoes" text,
	"caminho" text,
	"criado_por_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresa_marinheiros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"cpf" text,
	"funcao" text,
	"numero_habilitacao" text,
	"categoria" text,
	"data_emissao" date,
	"data_validade" date,
	"habilitacao_caminho" text,
	"observacoes" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"razao_social" text NOT NULL,
	"nome_fantasia" text,
	"cnpj" text,
	"inscricao_estadual" text,
	"endereco" text,
	"telefone" text,
	"email" text,
	"responsavel" text,
	"observacoes" text,
	"status" "empresa_status" DEFAULT 'ativa' NOT NULL,
	"cliente_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_compra_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compra_id" uuid NOT NULL,
	"produto_id" uuid NOT NULL,
	"quantidade" integer DEFAULT 1 NOT NULL,
	"quantidade_recebida" integer DEFAULT 0 NOT NULL,
	"preco_unitario" numeric DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loja_compras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"fornecedor_id" uuid NOT NULL,
	"status" "loja_compra_status" DEFAULT 'rascunho' NOT NULL,
	"data_prevista" date,
	"observacoes" text,
	"criado_por_id" uuid,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loja_compras_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "loja_produto_fornecedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"produto_id" uuid NOT NULL,
	"fornecedor_id" uuid NOT NULL,
	"preco" numeric DEFAULT '0' NOT NULL,
	"prazo_entrega" text,
	"condicao_pagamento" text,
	"preferencial" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ALTER COLUMN "nome" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "razao_social" text NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "nome_fantasia" text;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "cnpj" text;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "telefone" text;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "endereco" text;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "cidade" text;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "contato_responsavel" text;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "observacoes" text;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "condicoes_pagamento" text;--> statement-breakpoint
ALTER TABLE "loja_fornecedores" ADD COLUMN "prazo_medio_entrega" text;--> statement-breakpoint
ALTER TABLE "loja_orcamento_itens" ADD COLUMN "desconto" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_orcamentos" ADD COLUMN "vendedor_id" uuid;--> statement-breakpoint
ALTER TABLE "loja_orcamentos" ADD COLUMN "validade" date;--> statement-breakpoint
ALTER TABLE "loja_orcamentos" ADD COLUMN "desconto" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_orcamentos" ADD COLUMN "frete" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_orcamentos" ADD COLUMN "forma_pagamento" text;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "marca" text;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "modelo" text;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "ficha_tecnica" text;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "unidade" text DEFAULT 'un' NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "disponibilidade" text DEFAULT 'estoque' NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "custo" numeric;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "margem" numeric;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "desconto_maximo" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "preco_promocional" numeric;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "estoque_minimo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "estoque_reservado" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "numero_serie" text;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "ano_fabricacao" text;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "potencia" text;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "caracteristicas_tecnicas" text;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD COLUMN "fornecedor_id" uuid;--> statement-breakpoint
ALTER TABLE "loja_vendas" ADD COLUMN "vendedor_id" uuid;--> statement-breakpoint
ALTER TABLE "loja_vendas" ADD COLUMN "forma_pagamento" text;--> statement-breakpoint
ALTER TABLE "loja_vendas" ADD COLUMN "frete" numeric DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "embarcacao_sparapan_arquivos" ADD CONSTRAINT "embarcacao_sparapan_arquivos_embarcacao_id_embarcacoes_sparapan_id_fk" FOREIGN KEY ("embarcacao_id") REFERENCES "public"."embarcacoes_sparapan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_alertas" ADD CONSTRAINT "empresa_alertas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_alertas" ADD CONSTRAINT "empresa_alertas_documento_id_empresa_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."empresa_documentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_alertas" ADD CONSTRAINT "empresa_alertas_manutencao_id_empresa_manutencoes_id_fk" FOREIGN KEY ("manutencao_id") REFERENCES "public"."empresa_manutencoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_documentos" ADD CONSTRAINT "empresa_documentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_documentos" ADD CONSTRAINT "empresa_documentos_embarcacao_id_empresa_embarcacoes_id_fk" FOREIGN KEY ("embarcacao_id") REFERENCES "public"."empresa_embarcacoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_documentos" ADD CONSTRAINT "empresa_documentos_substituido_por_id_empresa_documentos_id_fk" FOREIGN KEY ("substituido_por_id") REFERENCES "public"."empresa_documentos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_documentos" ADD CONSTRAINT "empresa_documentos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_embarcacoes" ADD CONSTRAINT "empresa_embarcacoes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_manutencoes" ADD CONSTRAINT "empresa_manutencoes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_manutencoes" ADD CONSTRAINT "empresa_manutencoes_embarcacao_id_empresa_embarcacoes_id_fk" FOREIGN KEY ("embarcacao_id") REFERENCES "public"."empresa_embarcacoes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_manutencoes" ADD CONSTRAINT "empresa_manutencoes_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresa_marinheiros" ADD CONSTRAINT "empresa_marinheiros_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_compra_itens" ADD CONSTRAINT "loja_compra_itens_compra_id_loja_compras_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."loja_compras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_compra_itens" ADD CONSTRAINT "loja_compra_itens_produto_id_loja_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."loja_produtos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_compras" ADD CONSTRAINT "loja_compras_fornecedor_id_loja_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."loja_fornecedores"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_compras" ADD CONSTRAINT "loja_compras_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_produto_fornecedores" ADD CONSTRAINT "loja_produto_fornecedores_produto_id_loja_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."loja_produtos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_produto_fornecedores" ADD CONSTRAINT "loja_produto_fornecedores_fornecedor_id_loja_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."loja_fornecedores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_orcamentos" ADD CONSTRAINT "loja_orcamentos_vendedor_id_usuarios_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_produtos" ADD CONSTRAINT "loja_produtos_fornecedor_id_loja_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."loja_fornecedores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loja_vendas" ADD CONSTRAINT "loja_vendas_vendedor_id_usuarios_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;