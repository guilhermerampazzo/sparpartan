/**
 * Logo do sistema. O src aponta para /api/logo, que serve o logo personalizado
 * (upload em Configurações → Logo) ou o padrão public/logo.svg quando não há
 * upload. Usa <img> nativo de propósito: o otimizador do next/image rejeita SVG.
 */
export function Logo({
  size = 64,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/api/logo"
      alt="Sparapan"
      width={size}
      height={size}
      className={className ?? "object-contain"}
    />
  );
}
