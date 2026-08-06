import { cookies } from "next/headers";

/**
 * Tema vindo do cookie. O layout raiz renderiza `<html data-theme>` a partir
 * daqui: como o atributo passa a ser controlado pelo React (prop do servidor),
 * navegações que re-renderizam o layout (redirect de server action, voltar/
 * avançar) não o removem mais — antes o tema era setado só via script no
 * cliente e o React o apagava ao reconciliar o `<html>`, voltando ao claro.
 */
export async function obterTemaServidor(): Promise<"light" | "dark"> {
  const valor = (await cookies()).get("tema")?.value;
  return valor === "dark" ? "dark" : "light";
}
