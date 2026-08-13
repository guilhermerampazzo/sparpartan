import { BackButton } from "@/components/ui";

import { NovoClienteForm } from "./form";

export default async function NovoClientePage() {
  return (
    <>
      <BackButton href="/clientes" />
      <NovoClienteForm />
    </>
  );
}
