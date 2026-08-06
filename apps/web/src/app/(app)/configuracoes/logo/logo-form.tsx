"use client";

import { useActionState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { FormError, SubmitButton } from "@/components/ui";
import { salvarLogo } from "./actions";

export function LogoUploadForm() {
  const [estado, formAction] = useActionState(salvarLogo, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4">
      <FormError erro={estado?.erro} />
      {estado?.ok && (
        <div className="w-full rounded-lg border border-success/40 bg-success-container px-4 py-2 text-body-sm text-on-success-container">
          {estado.ok}
        </div>
      )}
      <label className="flex flex-col gap-1">
        <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Imagem do logo</span>
        <input
          name="logo"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
          required
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        />
      </label>
      <SubmitButton icon={<ImageIcon size={16} />}>Salvar Logo</SubmitButton>
    </form>
  );
}
