const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    if (stored !== "dark" && stored !== "light") {
      stored = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      // Sincroniza o cookie para o servidor renderizar o <html> com o tema
      // certo na próxima navegação (evita "piscar" e perder o tema ao voltar).
      document.cookie = "tema=" + stored + ";path=/;max-age=31536000;SameSite=Lax";
    }
    document.documentElement.setAttribute("data-theme", stored);
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
