ALTER TABLE "despesas" ADD COLUMN "cliente_id" uuid;--> statement-breakpoint
ALTER TABLE "despesas" ADD COLUMN "criado_por_id" uuid;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;