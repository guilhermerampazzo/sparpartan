import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { templatesEmail } from "@/db/schema";
import { EditarTemplateForm } from "./form";

export default async function EditarTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [template] = await db.select().from(templatesEmail).where(eq(templatesEmail.id, id)).limit(1);
  if (!template) notFound();

  return <EditarTemplateForm templateId={template.id} valoresIniciais={template} />;
}
