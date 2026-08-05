import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assinaturas, documentosGerados, modelosDocumento, clientes } from "@/db/schema";
import { assinarDocumento } from "./actions";

export default async function AssinarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [assinatura] = await db
    .select()
    .from(assinaturas)
    .where(eq(assinaturas.token, token))
    .limit(1);

  if (!assinatura) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-outline">Link de assinatura inválido.</p>
      </main>
    );
  }

  const [documento] = await db
    .select()
    .from(documentosGerados)
    .where(eq(documentosGerados.id, assinatura.documentoId))
    .limit(1);
  const [modelo] = documento
    ? await db.select().from(modelosDocumento).where(eq(modelosDocumento.id, documento.modeloId)).limit(1)
    : [];
  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, assinatura.clienteId))
    .limit(1);

  const expirado = new Date(assinatura.expiraEm) < new Date() && assinatura.status !== "assinado";
  const assinarComToken = assinarDocumento.bind(null, token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-8 shadow-md">
        <h1 className="font-display text-headline-md font-bold text-primary">
          Assinatura Digital
        </h1>
        <p className="mb-6 text-sm text-outline">Sparapan Solução Naval</p>

        <p className="mb-4 text-sm text-primary">
          Documento: <strong>{modelo?.nome}</strong>
          <br />
          Cliente: <strong>{cliente?.nome}</strong>
        </p>

        {assinatura.status === "assinado" ? (
          <div className="rounded-lg bg-success-container p-4 text-body-sm text-on-success-container">
            <p className="font-semibold">Documento assinado com sucesso.</p>
            <p className="mt-2">
              {assinatura.assinadoEm && new Date(assinatura.assinadoEm).toLocaleString("pt-BR")}
            </p>
            <p className="mt-2 break-all font-mono text-xs">{assinatura.hash}</p>
          </div>
        ) : expirado ? (
          <p className="rounded-lg bg-error-container p-4 text-sm text-on-error-container">
            Este link de assinatura expirou. Entre em contato com a Sparapan para gerar um novo.
          </p>
        ) : (
          <form action={assinarComToken}>
            <p className="mb-4 text-xs text-outline">
              Ao clicar em &quot;Assinar&quot;, você concorda com o conteúdo do documento acima. O
              aceite será registrado com data, hora e IP de origem.
            </p>
            <button
              type="submit"
              className="w-full rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary shadow-md hover:bg-primary-container"
            >
              Assinar Documento
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
