ALTER TYPE "public"."loja_orcamento_status" ADD VALUE 'rascunho';--> statement-breakpoint
ALTER TYPE "public"."loja_orcamento_status" ADD VALUE 'enviado';--> statement-breakpoint
ALTER TYPE "public"."loja_orcamento_status" ADD VALUE 'aguardando_aprovacao';--> statement-breakpoint
ALTER TYPE "public"."loja_orcamento_status" ADD VALUE 'expirado';--> statement-breakpoint
ALTER TYPE "public"."loja_orcamento_status" ADD VALUE 'convertido';--> statement-breakpoint
ALTER TYPE "public"."loja_venda_status" ADD VALUE 'aprovada';--> statement-breakpoint
ALTER TYPE "public"."loja_venda_status" ADD VALUE 'aguardando_pagamento';--> statement-breakpoint
ALTER TYPE "public"."loja_venda_status" ADD VALUE 'pagamento_parcial';--> statement-breakpoint
ALTER TYPE "public"."loja_venda_status" ADD VALUE 'pago';--> statement-breakpoint
ALTER TYPE "public"."loja_venda_status" ADD VALUE 'preparando_entrega';--> statement-breakpoint
ALTER TYPE "public"."loja_venda_status" ADD VALUE 'entregue';