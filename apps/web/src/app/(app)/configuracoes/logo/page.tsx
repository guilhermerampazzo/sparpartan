import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { SectionCard } from "@/components/ui/form-field";
import { ConfirmButton } from "@/components/ui";
import { BackButton } from "@/components/ui";
import { LogoUploadForm } from "./logo-form";
import { removerLogo } from "./actions";

export default async function ConfigLogoPage() {
  const pastaLogo = path.join(process.env.UPLOADS_DIR ?? "./data/uploads", "logo");
  let temLogoPersonalizado = false;
  try {
    await mkdir(pastaLogo, { recursive: true });
    const arquivos = await readdir(pastaLogo);
    temLogoPersonalizado = arquivos.some((a) => !a.startsWith("."));
  } catch {
    temLogoPersonalizado = false;
  }

  return (
    <div className="space-y-gutter">
      <BackButton href="/configuracoes" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Logo do Sistema</h1>

      <SectionCard title="Visualização atual">
        <div className="flex flex-wrap items-center gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/logo"
            alt="Logo atual"
            className="h-24 w-24 rounded-lg border border-outline-variant bg-surface p-2 object-contain"
          />
          <p className="max-w-sm text-body-sm text-outline">
            {temLogoPersonalizado
              ? "Este é o logo personalizado — aparece no menu lateral e no topo do sistema."
              : "Você está usando o logo padrão da Sparapan. Envie uma imagem para personalizar."}
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Enviar novo logo">
        <p className="mb-4 text-body-sm text-outline">
          Formatos aceitos: PNG, JPG, WEBP ou SVG (máx. 2 MB). Prefira uma imagem com fundo
          transparente — a atualização vale para todo o sistema.
        </p>
        <LogoUploadForm />
      </SectionCard>

      {temLogoPersonalizado && (
        <SectionCard title="Restaurar logo padrão">
          <p className="mb-4 text-body-sm text-outline">
            Remove o logo personalizado e volta a usar o logo original da Sparapan.
          </p>
          <form action={removerLogo}>
            <ConfirmButton mensagem="Remover o logo personalizado e voltar ao padrão?" variant="outlined">
              Remover Logo Personalizado
            </ConfirmButton>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
